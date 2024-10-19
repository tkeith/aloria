import { env } from "@/env";
import { GoogleGenerativeAI } from "@google/generative-ai";
import sharp from "sharp";
import fs from "fs";
import path from "path";

interface Coordinates {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

async function fileToGenerativePart(
  file: Buffer,
): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return {
    inlineData: {
      data: file.toString("base64"),
      mimeType: "image/jpeg",
    },
  };
}

function extractCoordinates(text: string): Coordinates[] {
  const regex = /\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/g;
  const matches = text.matchAll(regex);
  return Array.from(matches).map((match) => ({
    ymin: parseInt(match[1]!) / 1000,
    xmin: parseInt(match[2]!) / 1000,
    ymax: parseInt(match[3]!) / 1000,
    xmax: parseInt(match[4]!) / 1000,
  }));
}

async function drawBoundingBox(
  imageBuffer: Buffer,
  boundingBox: Coordinates,
): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to determine image dimensions");
  }

  const { xmin, ymin, xmax, ymax } = boundingBox;
  const width = xmax - xmin;
  const height = ymax - ymin;

  const svg = `
    <svg width="${metadata.width}" height="${metadata.height}">
      <rect x="${xmin}" y="${ymin}" width="${width}" height="${height}"
        fill="none" stroke="red" stroke-width="4"/>
    </svg>
  `;

  return await image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .toBuffer();
}

export async function getElementBoundingBox({
  image,
  elementDescription,
}: {
  image: Buffer;
  elementDescription: string;
}): Promise<{ boundingBox: Coordinates; screenshotWithBoundingBox: Buffer }> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment variables");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

  try {
    const processedImage = await resizeAndCompressImage(image);
    const metadata = await sharp(processedImage).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Unable to determine processed image dimensions");
    }

    const imagePart = await fileToGenerativePart(processedImage);
    const prompt = `Return a bounding box as a JSON array [ymin, xmin, ymax, xmax] for this clickable element: ${elementDescription}`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const coordinates = extractCoordinates(response.text());

    if (coordinates.length > 0 && coordinates[0]) {
      const { xmin, ymin, xmax, ymax } = coordinates[0];

      // Get original image dimensions
      const originalMetadata = await sharp(image).metadata();
      const originalWidth = originalMetadata.width;
      const originalHeight = originalMetadata.height;

      if (!originalWidth || !originalHeight) {
        throw new Error("Unable to determine original image dimensions");
      }

      // Convert coordinates back to original image dimensions
      const boundingBox = {
        ymin: Math.round(ymin * originalHeight),
        xmin: Math.round(xmin * originalWidth),
        ymax: Math.round(ymax * originalHeight),
        xmax: Math.round(xmax * originalWidth),
      };

      // Create img-history folder if it doesn't exist
      const imgHistoryFolder = path.join(process.cwd(), "img-history");
      if (!fs.existsSync(imgHistoryFolder)) {
        fs.mkdirSync(imgHistoryFolder);
      }

      // Generate a unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const outputPath = path.join(
        imgHistoryFolder,
        `bounding-box-${timestamp}.jpg`,
      );

      // Draw the bounding box and save the image
      const screenshotWithBoundingBox = await drawBoundingBox(
        image,
        boundingBox,
      );
      console.log(`Image with bounding box saved to: ${outputPath}`);

      return { boundingBox, screenshotWithBoundingBox };
    } else {
      throw new Error("No valid coordinates found in the response");
    }
  } catch (error) {
    console.error("Error getting coordinates:", error);
    throw error;
  }
}

async function resizeAndCompressImage(imageBuffer: Buffer): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (metadata.width && metadata.width > 1000) {
    image.resize({ width: 1000 });
  }

  return image.jpeg({ quality: 70 }).toBuffer();
}
