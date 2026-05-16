const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const cors = require('cors');

const app = express();

app.use(cors());

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function calculateScore(brightness, textLength, faceCount) {

  let score = 50;

  if (brightness > 130) score += 15;
  if (brightness < 60) score -= 10;

  if (textLength > 5 && textLength < 40) {
    score += 20;
  }

  if (textLength > 100) {
    score -= 20;
  }

  if (faceCount > 0) {
    score += 20;
  }

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  return score;
}

async function analyzeThumbnail(imagePath) {

  const convertedPath = imagePath + '.png';

  await sharp(imagePath)
    .png()
    .toFile(convertedPath);

  const image = sharp(convertedPath);

  const stats = await image.stats();

  const metadata = await image.metadata();

  const width = metadata.width || 0;
  const height = metadata.height || 0;

  const brightness = Math.round(
    (
      stats.channels[0].mean +
      stats.channels[1].mean +
      stats.channels[2].mean
    ) / 3
  );

  const ocr = await Tesseract.recognize(convertedPath, 'eng');

  let text = ocr.data.text
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  text = text.substring(0, 120);

  const emotionalWords = [
    'mrbeast',
    'exposed',
    'crazy',
    'shocked',
    'secret',
    'insane',
    'viral',
    'warning',
    'danger',
    'banned',
    'truth',
    'destroyed',
    'vs',
    'win',
    'lose',
    'million',
    'free'
  ];

  let emotionalScore = 0;

  emotionalWords.forEach(word => {
    if (text.toLowerCase().includes(word)) {
      emotionalScore += 10;
    }
  });

  let faceCount = 0;

  if (emotionalScore > 20) {
    faceCount = 1;
  }

  const thumbnailScore = calculateScore(
    brightness,
    text.length,
    faceCount
  );

  let ctrPrediction = 'Medium';

  if (thumbnailScore >= 80) {
    ctrPrediction = 'High';
  }

  if (thumbnailScore < 50) {
    ctrPrediction = 'Low';
  }

  let brightnessLevel = 'Good';

  if (brightness < 60) {
    brightnessLevel = 'Too Dark';
  }

  if (brightness > 180) {
    brightnessLevel = 'Too Bright';
  }

  let imageQuality = 'Good';

  if (width < 500 || height < 500) {
    imageQuality = 'Low Resolution';
  }

  let viralScore = thumbnailScore + emotionalScore / 2;

  if (viralScore > 100) {
    viralScore = 100;
  }

  let clickbaitScore = 50;

  clickbaitScore += emotionalScore;

  if (faceCount > 0) {
    clickbaitScore += 20;
  }

  if (brightness > 130) {
    clickbaitScore += 10;
  }

  if (text.length > 5 && text.length < 40) {
    clickbaitScore += 10;
  }

  if (clickbaitScore > 100) {
    clickbaitScore = 100;
  }

  let thumbnailIQ = Math.round(
    (thumbnailScore + viralScore + clickbaitScore) / 3
  );

  let viralProbability = `${Math.min(
    Math.round((viralScore + emotionalScore) * 0.8),
    99
  )}%`;

  let youtubeNiche = 'general';

  if (
    text.toLowerCase().includes('crypto') ||
    text.toLowerCase().includes('bitcoin')
  ) {
    youtubeNiche = 'crypto';
  }

  if (
    text.toLowerCase().includes('mrbeast') ||
    text.toLowerCase().includes('challenge')
  ) {
    youtubeNiche = 'challenge';
  }

  if (
    text.toLowerCase().includes('exposed') ||
    text.toLowerCase().includes('drama')
  ) {
    youtubeNiche = 'drama';
  }

  const roastMessages = [
    'This thumbnail looks like it was made during a power outage.',
    'Your thumbnail is fighting for attention and losing.',
    'This thumbnail has the emotional power of plain oatmeal.',
    'Looks decent but needs stronger contrast and emotion.',
    'Actually pretty solid. Just push the emotion harder.'
  ];

  const randomRoast =
    roastMessages[Math.floor(Math.random() * roastMessages.length)];

  const rewrittenHooks = [
    'I REGRET THIS...',
    'THIS CHANGED EVERYTHING',
    'THE TRUTH EXPOSED',
    'YOU WONT BELIEVE THIS',
    'THIS WAS A HUGE MISTAKE'
  ];

  let coachAdvice =
    'Your thumbnail has decent structure but needs stronger emotional triggers and bigger visual focus.';

  const suggestions = [];

  if (faceCount === 0) {
    suggestions.push('Add expressive face for better CTR');
  }

  if (text.length > 80) {
    suggestions.push('Reduce text amount');
  }

  if (brightness < 60) {
    suggestions.push('Increase brightness');
  }

  if (brightness > 180) {
    suggestions.push('Reduce overexposure');
  }

  if (width < 1000) {
    suggestions.push('Use higher resolution thumbnail');
  }

  if (emotionalScore < 20) {
    suggestions.push('Add stronger emotional words');
  }

  if (suggestions.length === 0) {
    suggestions.push('Thumbnail looks optimized');
  }

  fs.unlinkSync(convertedPath);

  return {
    thumbnail_score: thumbnailScore,
    viral_score: Math.round(viralScore),

    thumbnail_iq: thumbnailIQ,

    viral_probability: viralProbability,

    youtube_niche: youtubeNiche,

    thumbnail_roast: randomRoast,

    ai_rewritten_hooks: rewrittenHooks,

    coach_advice: coachAdvice,

    clickbait_score: clickbaitScore,

    ctr_prediction: ctrPrediction,

    emotional_score: emotionalScore,

    brightness,

    brightness_level: brightnessLevel,

    image_width: width,

    image_height: height,

    image_quality: imageQuality,

    text_detected: text,

    text_length: text.length,

    faces_detected: faceCount,

    suggestions,
  };
}

app.post('/analyze-thumbnail', upload.single('image'), async (req, res) => {

  try {

    const result = await analyzeThumbnail(req.file.path);

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: 'Thumbnail analysis failed',
    });

  }
});

app.post('/compare-thumbnails', upload.fields([
  { name: 'thumbnail_a', maxCount: 1 },
  { name: 'thumbnail_b', maxCount: 1 }
]), async (req, res) => {

  try {

    const imageA = req.files.thumbnail_a[0].path;
    const imageB = req.files.thumbnail_b[0].path;

    const resultA = await analyzeThumbnail(imageA);
    const resultB = await analyzeThumbnail(imageB);

    fs.unlinkSync(imageA);
    fs.unlinkSync(imageB);

    let winner = 'thumbnail_a';
    let reason = 'Better emotional and CTR optimization';

    if (resultB.thumbnail_score > resultA.thumbnail_score) {
      winner = 'thumbnail_b';
    }

    const confidence = Math.min(
      Math.abs(resultA.thumbnail_score - resultB.thumbnail_score) + 50,
      100
    );

    res.json({
      success: true,
      winner,
      confidence,
      reason,
      thumbnail_a: resultA,
      thumbnail_b: resultB,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: 'Thumbnail comparison failed',
    });

  }
});

app.get('/', (req, res) => {
  res.send('GOD MODE Thumbnail Creator API Running');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});