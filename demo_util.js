
import * as posenet from '@tensorflow-models/posenet';
import * as tf from '@tensorflow/tfjs';

const color = 'chartreuse';
const boundingBoxColor = 'darkGrey';
const lineWidth = 2;
var prev = 0;

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isMobile() {
  return isAndroid() || isiOS();
}

function setDatGuiPropertyCss(propertyText, liCssString, spanCssString = '') {
  var spans = document.getElementsByClassName('property-name');
  for (var i = 0; i < spans.length; i++) {
    var text = spans[i].textContent || spans[i].innerText;
    if (text == propertyText) {
      spans[i].parentNode.parentNode.style = liCssString;
      if (spanCssString !== '') {
        spans[i].style = spanCssString;
      }
    }
  }
}


export function toggleLoadingUI(
    showLoadingUI, loadingDivId = 'loading', mainDivId = 'main') {
  if (showLoadingUI) {
    document.getElementById(loadingDivId).style.display = 'block';
    document.getElementById(mainDivId).style.display = 'none';
  } else {
    document.getElementById(loadingDivId).style.display = 'none';
    document.getElementById(mainDivId).style.display = 'block';
  }
}

function toTuple({y, x}) {
  return [y, x];
}

export function drawPoint(ctx, y, x, r, color, name) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = 'black';
  //ctx.fillText(name, x, y,);
}


export function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
}


export function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
  //console.log(keypoints);
  const adjacentKeyPoints =
      posenet.getAdjacentKeyPoints(keypoints, minConfidence);

  adjacentKeyPoints.forEach((keypoints) => {
    drawSegment(
        toTuple(keypoints[0].position), toTuple(keypoints[1].position), color,
        scale, ctx);
  });
}



export function jumping_jack_calc(keypoints, minConfidence, ctx, wko_started){
  const right_ident = keypoints[10].score > minConfidence && keypoints[14].score > minConfidence && keypoints[16].score > minConfidence;
  const left_ident = keypoints[9].score > minConfidence && keypoints[13].score > minConfidence && keypoints[15].score > minConfidence;

  if (right_ident && left_ident && wko_started == 1) {
    const wrist_diff = Math.abs(keypoints[10].position.x - keypoints[9].position.x);
    console.log('wrist_diff: ', wrist_diff);
    const knee_diff = Math.abs(keypoints[14].position.x - keypoints[13].position.x);
    console.log('knee_diff: ', knee_diff);
    const ankle_diff = Math.abs(keypoints[16].position.x - keypoints[15].position.x)
    console.log('ankle_diff: ', ankle_diff);

    const sum = wrist_diff + ankle_diff;
    console.log('sum: ', sum);
    if (sum <= 55){
      if (prev == 0){
        prev = -1;
        return 0;
      }
      else if (prev == 1){
        prev = -1;
        return 1;
      }
    }
    else if (prev == -1){
      prev = 1;
      return 1;
    }
    
  }
  return 0;
}

export function weight_lifting_calc(keypoints, minConfidence, ctx, wko_started){

  const right_ident = keypoints[8].score > minConfidence && keypoints[8].score > minConfidence
  const left_ident = keypoints[7].score > minConfidence && keypoints[9].score > minConfidence

  if (right_ident && left_ident && wko_started == 1) {  
      const delta_rx = keypoints[10].position.x - keypoints[8].position.x;
      const delta_ry = keypoints[10].position.y - keypoints[8].position.y;
      const right_teta = Math.atan2(delta_ry, delta_rx) * 180 / Math.PI;

      const delta_lx = keypoints[9].position.x - keypoints[7].position.x;
      const delta_ly = keypoints[9].position.y - keypoints[7].position.y;
      const left_teta = Math.atan2(delta_ly, delta_lx) * 180 / Math.PI;
  
      //console.log(right_teta);
      
      if (right_teta > 0){
        ctx.font = "25px Arial";
        //ctx.fillStyle = "red";
        ctx.fillText('Down', 10, 50,);
        if (prev == 0){
          prev = -1;
          return 0;
        }
        else if (prev == 1){
          prev = -1;
          return 1;
        }
      }
      else if(right_teta  < 0){
        ctx.font = "25px Arial";
        //ctx.fillStyle = "green";
        ctx.fillText('Up', 10, 50,);
        if (prev == 0){
          prev = 1;
          return 0;
        }
        else if (prev == -1){
          prev = 1;
          return 1;
        }
      }
    }
  return 0;
}


export function global_zero(){
  prev = 0;
}
export function drawKeypoints(keypoints, minConfidence, ctx, 
  repetitions, wko_started, activity, scale = 1) {
  //console.log(repetitions);
  
  
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];

    if (keypoint.score < minConfidence) {
      continue;
    }

    const {y, x} = keypoint.position;
    drawPoint(ctx, y * scale, x * scale, 3, color, keypoint.part);
    
    //console.log(keypoint);
  }
  console.log(activity)
  if (activity == 'Weight Lifting'){
    return weight_lifting_calc(keypoints, minConfidence, ctx, wko_started)
  }
  else if (activity == 'Jumping jack'){
    return jumping_jack_calc(keypoints, minConfidence, ctx, wko_started);
  }
  else{
    return 0
  }
  
}

export function drawBoundingBox(keypoints, ctx) {
  const boundingBox = posenet.getBoundingBox(keypoints);

  ctx.rect(
      boundingBox.minX, boundingBox.minY, boundingBox.maxX - boundingBox.minX,
      boundingBox.maxY - boundingBox.minY);

  ctx.strokeStyle = boundingBoxColor;
  ctx.stroke();
}


export async function renderToCanvas(a, ctx) {
  const [height, width] = a.shape;
  const imageData = new ImageData(width, height);

  const data = await a.data();

  for (let i = 0; i < height * width; ++i) {
    const j = i * 4;
    const k = i * 3;

    imageData.data[j + 0] = data[k + 0];
    imageData.data[j + 1] = data[k + 1];
    imageData.data[j + 2] = data[k + 2];
    imageData.data[j + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
}


export function renderImageToCanvas(image, size, canvas) {
  canvas.width = size[0];
  canvas.height = size[1];
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0);
}


export function drawHeatMapValues(heatMapValues, outputStride, canvas) {
  const ctx = canvas.getContext('2d');
  const radius = 5;
  const scaledValues = heatMapValues.mul(tf.scalar(outputStride, 'int32'));

  drawPoints(ctx, scaledValues, radius, color, name);
}

function drawPoints(ctx, points, radius, color, name) {
  const data = points.buffer().values;

  for (let i = 0; i < data.length; i += 2) {
    const pointY = data[i];
    const pointX = data[i + 1];

    if (pointX !== 0 && pointY !== 0) {
      ctx.beginPath();
      ctx.arc(pointX, pointY, radius, 0, 2 * Math.PI);
      //ctx.fillText(name, pointX, pointY,);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }
}


export function drawOffsetVectors(
    heatMapValues, offsets, outputStride, scale = 1, ctx) {
  const offsetPoints =
      posenet.singlePose.getOffsetPoints(heatMapValues, outputStride, offsets);

  const heatmapData = heatMapValues.buffer().values;
  const offsetPointsData = offsetPoints.buffer().values;

  for (let i = 0; i < heatmapData.length; i += 2) {
    const heatmapY = heatmapData[i] * outputStride;
    const heatmapX = heatmapData[i + 1] * outputStride;
    const offsetPointY = offsetPointsData[i];
    const offsetPointX = offsetPointsData[i + 1];

    drawSegment(
        [heatmapY, heatmapX], [offsetPointY, offsetPointX], color, scale, ctx);
  }
}
