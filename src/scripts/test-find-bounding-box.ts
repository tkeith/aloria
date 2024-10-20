import {
  drawBoundingBox,
  getElementBoundingBoxWithRetry,
  twoPassGetElementBoundingBox,
} from "@/lib/screenshot-bounding-box";
import fs from "fs";

const IMAGE_PATH = "/tmp/screenshot-1729381399988.jpeg";
const ELEMENT_DESCRIPTION =
  "the 'flights' text to the right of the currently selected 'stays' option";

async function main() {
  const image = await fs.promises.readFile(IMAGE_PATH);

  const { screenshotWithBoundingBox: image1, boundingBox } =
    await getElementBoundingBoxWithRetry({
      image,
      elementDescription: ELEMENT_DESCRIPTION,
    });

  console.log(boundingBox);

  // draw it
  const image2 = await drawBoundingBox(image, [
    { color: "red", boundingBox: boundingBox },
  ]);

  // save both images
  await fs.promises.writeFile("/tmp/image1.jpeg", image1);
  await fs.promises.writeFile("/tmp/image2.jpeg", image2);
  // log paths
  console.log(`/tmp/image1.jpeg`);
  console.log(`/tmp/image2.jpeg`);

  // now, try the two-pass version
  const { screenshotWithBoundingBox: image3, boundingBox: boundingBox2 } =
    await twoPassGetElementBoundingBox({
      image,
      elementDescription: ELEMENT_DESCRIPTION,
    });

  await fs.promises.writeFile("/tmp/image3.jpeg", image3);
  console.log(`/tmp/image3.jpeg`);
}

main().catch(console.error);
