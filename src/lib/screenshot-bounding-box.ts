import { env } from "@/env";
import { GoogleGenerativeAI } from "@google/generative-ai";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import assert from "assert";
import { z } from "zod";

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

function tupleToCoordinates(
  tuple: [number, number, number, number],
): Coordinates {
  const normalizedYmin = tuple[0] / 1000;
  const normalizedXmin = tuple[1] / 1000;
  const normalizedYmax = tuple[2] / 1000;
  const normalizedXmax = tuple[3] / 1000;

  // check that all are between 0 and 1 inclusive
  assert(normalizedYmin >= 0 && normalizedYmin <= 1);
  assert(normalizedXmin >= 0 && normalizedXmin <= 1);
  assert(normalizedYmax >= 0 && normalizedYmax <= 1);
  assert(normalizedXmax >= 0 && normalizedXmax <= 1);

  return {
    ymin: normalizedYmin,
    xmin: normalizedXmin,
    ymax: normalizedYmax,
    xmax: normalizedXmax,
  };
}

function extractCoordinates(text: string): Coordinates {
  // const regex =
  //   /\[\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*\]/g;
  // const matches = text.matchAll(regex);
  // return Array.from(matches).map((match) => ({
  //   ymin: parseInt(match[1]!) / 1000,`
  //   xmin: parseInt(match[2]!) / 1000,
  //   ymax: parseInt(match[3]!) / 1000,
  //   xmax: parseInt(match[4]!) / 1000,
  // }));

  // find the text from the first [ to the last ] without regex
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");

  // throw if either not found
  if (start === -1 || end === -1) {
    throw new Error("No valid coordinates found in the response");
  }

  const coordinatesText = text.slice(start, end + 1);
  try {
    let coordinatesRaw = z
      .array(z.unknown())
      .parse(JSON.parse(coordinatesText) as unknown);
    // is first item inside coordinates also an array?
    const firstItem = coordinatesRaw[0];
    if (Array.isArray(firstItem)) {
      const possibleCoordinates = z
        .tuple([z.number(), z.number(), z.number(), z.number()])
        .array()
        .parse(coordinatesRaw);
      let closestDistanceFromMiddle = -1; // distance from 0.5, 0.5
      let closestCoordinates: Coordinates | null = null;
      for (const coordinatesRaw of possibleCoordinates) {
        const coordinates = tupleToCoordinates(coordinatesRaw);

        const centerX = (coordinates.xmin + coordinates.xmax) / 2;
        const centerY = (coordinates.ymin + coordinates.ymax) / 2;

        const distance = Math.abs(centerX - 0.5) + Math.abs(centerY - 0.5);
        if (
          closestDistanceFromMiddle === -1 ||
          distance < closestDistanceFromMiddle
        ) {
          closestDistanceFromMiddle = distance;
          closestCoordinates = coordinates;
        }
      }
      assert(closestCoordinates !== null);
      return closestCoordinates;
    } else {
      const tuple = z
        .tuple([z.number(), z.number(), z.number(), z.number()])
        .parse(coordinatesRaw);

      return tupleToCoordinates(tuple);
    }
  } catch (error) {
    // in case normal parsing failed, try to find 4 integers in coordinatesText
    const regex =
      /\[\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*\]/g;
    const matches = coordinatesText.matchAll(regex);
    const possibleCoordinates = Array.from(matches).map((match) => ({
      ymin: parseInt(match[1]!) / 1000,
      xmin: parseInt(match[2]!) / 1000,
      ymax: parseInt(match[3]!) / 1000,
      xmax: parseInt(match[4]!) / 1000,
    }));
    return possibleCoordinates[0]!;
  }
}

export async function drawBoundingBox(
  imageBuffer: Buffer,
  boundingBoxes: { color: string; boundingBox: Coordinates }[],
): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to determine image dimensions");
  }

  const svgRects = boundingBoxes
    .map(({ color, boundingBox }) => {
      const { xmin, ymin, xmax, ymax } =
        convertFractionalCoordinatesToPixelCoordinates(boundingBox, {
          width: metadata.width!,
          height: metadata.height!,
        });
      const width = xmax - xmin;
      const height = ymax - ymin;

      return `<rect x="${xmin}" y="${ymin}" width="${width}" height="${height}"
      fill="none" stroke="${color}" stroke-width="4"/>`;
    })
    .join("\n");

  const svg = `
    <svg width="${metadata.width}" height="${metadata.height}">
      ${svgRects}
    </svg>
  `;

  return await image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .toBuffer();
}

export async function twoPassGetElementBoundingBox({
  image,
  elementDescription,
}: {
  image: Buffer;
  elementDescription: string;
}): Promise<{ boundingBox: Coordinates; screenshotWithBoundingBox: Buffer }> {
  console.log("*** begin two pass get element bounding box ***");

  const firstPass = await getElementBoundingBoxWithRetry({
    image,
    elementDescription,
  });

  // now, we want to get a version of the image including the bounding box and 100 pixels on each side
  const { boundingBox, screenshotWithBoundingBox } = firstPass;

  // log bounding box
  console.log(`first pass bounding box: ${JSON.stringify(boundingBox)}`);

  // save the first pass screenshot
  await fs.promises.writeFile(
    "/tmp/first-pass.jpeg",
    screenshotWithBoundingBox,
  );
  console.log(`/tmp/first-pass.jpeg`);

  const newTopFractional = Math.max(0, boundingBox.ymin - 0.1);
  // const newLeftFractional = Math.max(0, boundingBox.xmin - 0.2);
  // const newRightFractional = Math.min(1, boundingBox.xmax + 0.2);
  const newLeftFractional = 0;
  const newRightFractional = 1;
  const newBottomFractional = Math.min(1, boundingBox.ymax + 0.1);
  const newWidthFractional = newRightFractional - newLeftFractional;
  const newHeightFractional = newBottomFractional - newTopFractional;

  const imageDimensions = await getImageDimensions(image);

  const newLeft = Math.max(0, newLeftFractional * imageDimensions.width);
  const newTop = Math.max(0, newTopFractional * imageDimensions.height);
  const newRight = Math.min(
    imageDimensions.width,
    newRightFractional * imageDimensions.width,
  );
  const newBottom = Math.min(
    imageDimensions.height,
    newBottomFractional * imageDimensions.height,
  );

  console.log("Debug values for cropping:");
  console.log("newLeft:", newLeft);
  console.log("newTop:", newTop);
  console.log("newRight:", newRight);
  console.log("newBottom:", newBottom);
  console.log("Crop width:", newRight - newLeft);
  console.log("Crop height:", newBottom - newTop);

  const sharpImage = sharp(image);
  const croppedImage = await sharpImage
    .extract({
      left: Math.round(newLeft),
      top: Math.round(newTop),
      width: Math.round(newRight - newLeft),
      height: Math.round(newBottom - newTop),
    })
    .toBuffer();

  const secondPass = await getElementBoundingBoxWithRetry({
    image: croppedImage,
    elementDescription,
    // :
    //   elementDescription +
    //   `\n\n(If there are multiple possibilities, choose the one closest to the middle)`,
  });

  // save the second pass screenshot
  await fs.promises.writeFile(
    "/tmp/second-pass.jpeg",
    secondPass.screenshotWithBoundingBox,
  );
  console.log(`/tmp/second-pass.jpeg`);

  // const pixelCoordinates = convertFractionalCoordinatesToPixelCoordinates(
  //   secondPass.boundingBox,
  //   imageDimensions,
  // );

  // const adjustedPixelCoordinates = {
  //   ymin: pixelCoordinates.ymin + newTop,
  //   xmin: pixelCoordinates.xmin + newLeft,
  //   ymax: pixelCoordinates.ymax + newTop,
  //   xmax: pixelCoordinates.xmax + newLeft,
  // };

  console.log("Debug values:");
  console.log("newTopFractional:", newTopFractional);
  console.log("newLeftFractional:", newLeftFractional);
  console.log("newHeightFractional:", newHeightFractional);
  console.log("newWidthFractional:", newWidthFractional);
  console.log("secondPass.boundingBox:", secondPass.boundingBox);

  const secondPassCoordinatesOnFirstPassImage = {
    ymin: newTopFractional + secondPass.boundingBox.ymin * newHeightFractional,
    xmin: newLeftFractional + secondPass.boundingBox.xmin * newWidthFractional,
    ymax: newTopFractional + secondPass.boundingBox.ymax * newHeightFractional,
    xmax: newLeftFractional + secondPass.boundingBox.xmax * newWidthFractional,
  };

  console.log(
    "secondPassCoordinatesOnFirstPassImage:",
    secondPassCoordinatesOnFirstPassImage,
  );

  // const fractionalCoordinates = convertPixelCoordinatesToFractionalCoordinates(
  //   adjustedPixelCoordinates,
  //   imageDimensions,
  // );

  const drawn = await drawBoundingBox(image, [
    { color: "red", boundingBox },
    { color: "orange", boundingBox: secondPassCoordinatesOnFirstPassImage },
    // in green, the box of the image used for the second pass
    {
      color: "green",
      boundingBox: {
        ymin: newTopFractional,
        xmin: newLeftFractional,
        ymax: newBottomFractional,
        xmax: newRightFractional,
      },
    },
  ]);

  console.log("*** end two pass get element bounding box ***");

  return {
    boundingBox: secondPassCoordinatesOnFirstPassImage,
    screenshotWithBoundingBox: drawn,
  };
}

export async function getElementBoundingBoxWithRetry({
  image,
  elementDescription,
}: {
  image: Buffer;
  elementDescription: string;
}): Promise<{ boundingBox: Coordinates; screenshotWithBoundingBox: Buffer }> {
  // try up to 3 times
  for (let i = 0; i < 3; i++) {
    try {
      return await getElementBoundingBox({ image, elementDescription });
    } catch (error) {
      console.error("Error getting coordinates:", error);
    }
  }

  throw new Error("Failed to get element bounding box");
}

async function getElementBoundingBox({
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
    const prompt = `Return bounding boxes as JSON arrays [ymin, xmin, ymax, xmax]\n\n${elementDescription}`;

    console.log("*** gemini prompt ***\n" + prompt + "\n**************\n");

    let result;
    try {
      result = await model.generateContent([prompt, imagePart]);
    } catch (error) {
      console.error(
        "Error getting coordinates:",
        JSON.stringify(error, null, 2),
      );
      throw error;
    }

    console.log("Gemini response:", result.response.text());

    const response = result.response;
    const coordinates = extractCoordinates(response.text());

    const { xmin, ymin, xmax, ymax } = coordinates;

    // Get original image dimensions
    const originalMetadata = await sharp(image).metadata();
    const originalWidth = originalMetadata.width;
    const originalHeight = originalMetadata.height;

    if (!originalWidth || !originalHeight) {
      throw new Error("Unable to determine original image dimensions");
    }

    // Convert coordinates back to original image dimensions
    const boundingBox = {
      // ymin: Math.round(ymin * originalHeight),
      // xmin: Math.round(xmin * originalWidth),
      // ymax: Math.round(ymax * originalHeight),
      // xmax: Math.round(xmax * originalWidth),
      ymin,
      xmin,
      ymax,
      xmax,
    };

    console.log("Got bounding box:", JSON.stringify(boundingBox));

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
    const screenshotWithBoundingBox = await drawBoundingBox(image, [
      { color: "red", boundingBox },
    ]);

    return { boundingBox, screenshotWithBoundingBox };
  } catch (error) {
    // save the screenshot
    const outputPath = `/tmp/screenshot-${Date.now()}.png`;
    await fs.promises.writeFile(outputPath, image);

    console.log(JSON.stringify({ screenshotPath: outputPath }, null, 2));
    console.error("Error getting coordinates:", error);
    throw error;
  }
}

export async function resizeAndCompressImage(
  imageBuffer: Buffer,
): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (metadata.width && metadata.width > 1000) {
    image.resize({ width: 1000 });
  }

  return image.jpeg({ quality: 70 }).toBuffer();
}

async function getImageDimensions(
  imageBuffer: Buffer,
): Promise<{ width: number; height: number }> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  assert(metadata.width && metadata.height);
  return { width: metadata.width, height: metadata.height };
}

function convertFractionalCoordinatesToPixelCoordinates(
  coordinates: Coordinates,
  imageDimensions: { width: number; height: number },
): Coordinates {
  const { width, height } = imageDimensions;
  return {
    ymin: Math.round(coordinates.ymin * height),
    xmin: Math.round(coordinates.xmin * width),
    ymax: Math.round(coordinates.ymax * height),
    xmax: Math.round(coordinates.xmax * width),
  };
}

function convertPixelCoordinatesToFractionalCoordinates(
  coordinates: Coordinates,
  imageDimensions: { width: number; height: number },
): Coordinates {
  const { width, height } = imageDimensions;
  return {
    ymin: coordinates.ymin / height,
    xmin: coordinates.xmin / width,
    ymax: coordinates.ymax / height,
    xmax: coordinates.xmax / width,
  };
}
