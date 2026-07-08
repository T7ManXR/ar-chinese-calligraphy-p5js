// Augmented Reality Chinese Calligraphy Art with ml5.js
// Draw with black Ink using pinch gestures ('v' to change canvas, c' to draw, 'x' to stop, 'z' to reset)
// Use number keys (1-9) to change the brush stroke thickness, save screenshot with space bar

let video; // p5.js video capture element
let handPose; // The ml5.js handPose model instance
let hands = []; // Array to store hand detection results
let painting; // Brush stroke drawing buffer
let sw = 8; // Left hand pinch stroke width 
let brushSize = 10; // Base thickness for brush stroke
// Applying Hooke's Law in Physics
let spring = 0.4; // Spring constant controlling brush speed
let friction = 0.45; // Friction factor
let v = 0.5; // Velocity accumulator
let vx = 0; // Current horizontal velocity
let vy = 0; // Current vertical velocity
let splitNum = 50; // Number of stroke subdivisions 
let diff = 8; // Additional offset value
let f = false; // Brush toggle on/off
let x, y, r, oldX, oldY, oldR; // Previous and new brush positions

// Drawing toggle
let brushActive = false;

// Handpose Initialization
function preload() {
  handPose = ml5.handPose({flipped: true});
}

function gotHands(results) {
  hands = results;
}

// Fullscreen canvas sized responsive to all devices
function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(120);
  bgColor = color(250, 240, 230);
  background(bgColor);
  painting = createGraphics(windowWidth, windowHeight);
  painting.clear();
  video = createCapture(VIDEO, {flipped: true});
  video.size(windowWidth, windowHeight);
  video.hide();
  handPose.detectStart(video, gotHands);
}

function draw() {
  background(bgColor); // rice paper background
  tint(255, 50); // half opacity
  image(video, 0, 0, width, height); /* Comment this line to remove webcam and draw on paper only */
  noTint();
  image(painting, 0, 0);
  // String and Text Capitalization
  fill(0);
  noStroke();
  textSize(16);
  text("Brush Active: " + brushActive.toString().toUpperCase(), 10, 20);
  text("Brush Size: " + brushSize, 10, 40);
  // NULL variable initialization
  let rightHand = null;
  let leftHand = null;
  // Hand detection and drawing for left and right
  if (hands.length > 0) { 
    for (let hand of hands) {
      if (hand.handedness === 'Left') {
        leftHand = hand;
      } else if (hand.handedness === 'Right') {
        rightHand = hand;
      }
    }
    if (!rightHand) rightHand = hands[0];
  }
  /* Comment this section to deactivate left-hand detection */
  // Check for left hand detection (For left-handed users)
  if (leftHand) {
    let indexL, thumbL; // Let left index finger and thumb variables
    // Check if left hand data have annotations
    if (leftHand.annotations && leftHand.annotations.indexFinger && leftHand.annotations.thumb) {
      // Get the tips of the index finger and thumb
      indexL = leftHand.annotations.indexFinger[leftHand.annotations.indexFinger.length - 1];
      thumbL = leftHand.annotations.thumb[leftHand.annotations.thumb.length - 1];
    } 
    // Check if hand data include key point arrays
    else if (leftHand.landmarks && leftHand.landmarks.length >= 9) {
      indexL = leftHand.landmarks[8];
      thumbL = leftHand.landmarks[4];
    } 
    // Use index_finger_tip and thumb_tip to lock pinch gesture positioning
    else if (leftHand.index_finger_tip && leftHand.thumb_tip) {
      indexL = leftHand.index_finger_tip;
      thumbL = leftHand.thumb_tip;
    }
    // When index finger and thumb positions are detected
    if (indexL && thumbL) {
      // Extract x and y coordinates from left index finger and thumb
      /* JS if-else shorthand: Condition ? Expression if true : Expression if false */
      let lx = (indexL.x === undefined ? indexL[0] : indexL.x);
      let ly = (indexL.y === undefined ? indexL[1] : indexL.y);
      let tx = (thumbL.x === undefined ? thumbL[0] : thumbL.x);
      let ty = (thumbL.y === undefined ? thumbL[1] : thumbL.y);
      sw = dist(lx, ly, tx, ty); // Pinch width for brush stroke thickness
    }
  }
  /* For right-handed users */
  // Check for right hand detection
  if (rightHand) {
    let indexR, thumbR; // Let right index finger and thumb variables
    // Check if right hand data have annotations
    if (rightHand.annotations && rightHand.annotations.indexFinger && rightHand.annotations.thumb) {
      // Get the tips of the right index finger and thumb
      indexR = rightHand.annotations.indexFinger[rightHand.annotations.indexFinger.length - 1];
      thumbR = rightHand.annotations.thumb[rightHand.annotations.thumb.length - 1];
    } 
    // Check if hand data include key point arrays
    else if (rightHand.landmarks && rightHand.landmarks.length >= 9) {
      indexR = rightHand.landmarks[8];
      thumbR = rightHand.landmarks[4];
    } 
    // Use index_finger_tip and thumb_tip to lock pinch gesture positioning
    else if (rightHand.index_finger_tip && rightHand.thumb_tip) {
      indexR = rightHand.index_finger_tip;
      thumbR = rightHand.thumb_tip;
    }
    // When index finger and thumb positions are detected
    if (indexR && thumbR) {
      // Extract x and y coordinates from left index finger and thumb
      /* JS if-else shorthand: Condition ? Expression if true : Expression if false */
      let ix = (indexR.x !== undefined ? indexR.x : indexR[0]);
      let iy = (indexR.y !== undefined ? indexR.y : indexR[1]);
      let tx = (thumbR.x !== undefined ? thumbR.x : thumbR[0]);
      let ty = (thumbR.y !== undefined ? thumbR.y : thumbR[1]);
      // Calculate the midpoint between the index finger and thumb
      let pinchX = (ix + tx) / 2;
      let pinchY = (iy + ty) / 2;
      // Pinch position preview with a blue circle
      fill(0, 0, 255);
      noStroke();
      circle(pinchX, pinchY, 10);
      if (brushActive) {
        if (!f) { // Initialize brush position
          f = true;
          x = pinchX;
          y = pinchY;
        }
        // Update brush velocity with Hookes Law
        vx += (pinchX - x) * spring;
        vy += (pinchY - y) * spring;
        vx *= friction;
        vy *= friction;
        // Calculate brush speed with Pythagorean theorem
        let currentSpeed = sqrt(vx * vx + vy * vy);
        v += (currentSpeed - v);
        // Brush stroke code referenced from https://www.gorillasun.de/blog/simulating-brush-strokes-with-hookes-law-in-p5js-and-processing/
        v *= 0.6;
        oldR = r;
        r = brushSize - v;
        // Draw the brush stroke in segments for smoothness
        for (let i = 0; i < splitNum; i++) {
          oldX = x;
          oldY = y;
          x += vx / splitNum;
          y += vy / splitNum;
          oldR += (r - oldR) / splitNum;
          if (oldR < 1) { oldR = 1; }
          painting.stroke(0);
          painting.strokeWeight(oldR + diff);
          painting.line(x, y, oldX, oldY);
          painting.strokeWeight(oldR);
          painting.line(x + diff * 1.5, y + diff * 2, oldX + diff * 2, oldY + diff * 2);
          painting.line(x - diff, y - diff, oldX - diff, oldY - diff);
        }
      } else { // When brush inactive, reset velocities
        f = false;
        vx = 0;
        vy = 0;
      }
    }
  } 
  // Reset horizontal and vertical velocities
  else {
    vx = 0;
    vy = 0;
    f = false;
  }
}

// Change behaviour based on key press
function keyPressed() {
  if (key === 'c') {
    brushActive = true;
  } else if (key === 'x') {
    brushActive = false;
  } else if (key === 'z') {
    painting.clear();
    f = false;
    vx = 0;
    vy = 0;
  } else if (key === 'v') {
    if (red(bgColor) === 250) { 
      bgColor = color(255, 0, 0); 
    }
    else { bgColor = color(250, 240, 230); 
    }
  } else if (key === ' ') { 
    saveCanvas('drawing', 'png'); 
  } else if (key >= '1' && key <= '9') {
    brushSize = int(key) * 10;
  }
}

// Responsive Canvas Function
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  painting.resizeCanvas(windowWidth, windowHeight);
  video.size(windowWidth, windowHeight);
}