// backend/routes/publicRoutes.js
import express from 'express';
import Slider from '../models/Slider.js';
import Poster from '../models/Poster.js';
import Advertisement from '../models/Advertisement.js';
import SuccessStory from '../models/SuccessStory.js';
import Video from '../models/Video.js';

const router = express.Router();

// Get active sliders for public display
router.get('/sliders', async (req, res) => {
  try {
    const sliders = await Slider.find({ is_active: true })
      .sort({ display_order: 1, created_at: -1 })
      .select('title description image_url link_url display_duration display_order target_audience')
      .limit(10);
    
    res.json({ sliders });
  } catch (error) {
    console.error('Error fetching public sliders:', error);
    res.status(500).json({ error: 'Failed to fetch sliders' });
  }
});

// Get active posters for public display
router.get('/posters', async (req, res) => {
  try {
    const posters = await Poster.find({ is_active: true })
      .sort({ display_order: 1, created_at: -1 })
      .select('title description image_url link_url display_order target_audience')
      .limit(20);
    
    res.json({ posters });
  } catch (error) {
    console.error('Error fetching public posters:', error);
    res.status(500).json({ error: 'Failed to fetch posters' });
  }
});

// Get active advertisements for public display
router.get('/ads', async (req, res) => {
  try {
    const now = new Date();
    
    const ads = await Advertisement.find({
      is_active: true,
      $or: [
        { start_date: { $exists: false } },
        { start_date: null },
        { start_date: { $lte: now } }
      ],
      $or: [
        { end_date: { $exists: false } },
        { end_date: null },
        { end_date: { $gte: now } }
      ]
    })
      .sort({ placement: 1, display_order: 1, created_at: -1 })
      .select('title description ad_type placement image_url link_url display_duration display_order target_audience')
      .limit(15);
    
    // Update view count for each ad
    const adIds = ads.map(ad => ad._id);
    await Advertisement.updateMany(
      { _id: { $in: adIds } },
      { $inc: { view_count: 1 } }
    );
    
    res.json({ ads });
  } catch (error) {
    console.error('Error fetching public ads:', error);
    res.status(500).json({ error: 'Failed to fetch advertisements' });
  }
});

// Track ad click
router.post('/ads/:adId/click', async (req, res) => {
  try {
    const { adId } = req.params;
    
    await Advertisement.findByIdAndUpdate(
      adId,
      { $inc: { click_count: 1 } }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking ad click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// Get active success stories for public display
router.get('/success-stories', async (req, res) => {
  try {
    const stories = await SuccessStory.find({ is_active: true })
      .sort({ display_order: 1, created_at: -1 })
      .select('title description image_url category display_order')
      .limit(20);
    
    res.json({ stories });
  } catch (error) {
    console.error('Error fetching public success stories:', error);
    res.status(500).json({ error: 'Failed to fetch success stories' });
  }
});

// Get active video for public display
router.get('/videos', async (req, res) => {
  try {
    const video = await Video.findOne({ is_active: true })
      .sort({ created_at: -1 })
      .select('title description video_url thumbnail_url');
    
    res.json({ video });
  } catch (error) {
    console.error('Error fetching public video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

export default router;
