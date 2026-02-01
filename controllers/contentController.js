// backend/controllers/contentController.js
import Slider from '../models/Slider.js';
import Poster from '../models/Poster.js';
import Advertisement from '../models/Advertisement.js';
import SuccessStory from '../models/SuccessStory.js';
import Video from '../models/Video.js';
import AuditLog from '../models/AuditLog.js';

// ==================== SLIDERS ====================
export const listSliders = async (req, res) => {
  try {
    const { page = 1, limit = 50, is_active, target_audience } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (is_active !== undefined) filter.is_active = is_active === 'true';
    if (target_audience) filter.target_audience = target_audience;

    const sliders = await Slider.find(filter)
      .sort({ display_order: 1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('created_by', 'username email')
      .populate('updated_by', 'username email');

    const total = await Slider.countDocuments(filter);

    res.json({
      sliders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error listing sliders:', error);
    res.status(500).json({ error: 'Failed to fetch sliders' });
  }
};

export const createSlider = async (req, res) => {
  try {
    const sliderData = {
      ...req.body,
      created_by: req.user.id,
      updated_by: req.user.id
    };

    const slider = new Slider(sliderData);
    await slider.save();

    // Audit log
    await AuditLog.create({
      table_name: 'sliders',
      record_id: slider._id.toString(),
      action: 'CREATE',
      changed_by: req.user.id,
      new_values: { title: slider.title }
    });

    res.status(201).json({ slider, message: 'Slider created successfully' });
  } catch (error) {
    console.error('Error creating slider:', error);
    res.status(500).json({ error: 'Failed to create slider' });
  }
};

export const updateSlider = async (req, res) => {
  try {
    const { sliderId } = req.params;
    const updates = {
      ...req.body,
      updated_by: req.user.id
    };

    const slider = await Slider.findByIdAndUpdate(
      sliderId,
      updates,
      { new: true, runValidators: true }
    );

    if (!slider) {
      return res.status(404).json({ error: 'Slider not found' });
    }

    // Audit log
    await AuditLog.create({
      table_name: 'sliders',
      record_id: slider._id.toString(),
      action: 'UPDATE',
      changed_by: req.user.id,
      new_values: updates
    });

    res.json({ slider, message: 'Slider updated successfully' });
  } catch (error) {
    console.error('Error updating slider:', error);
    res.status(500).json({ error: 'Failed to update slider' });
  }
};

export const deleteSlider = async (req, res) => {
  try {
    const { sliderId } = req.params;

    const slider = await Slider.findByIdAndDelete(sliderId);

    if (!slider) {
      return res.status(404).json({ error: 'Slider not found' });
    }

    // Audit log
    await AuditLog.create({
      table_name: 'sliders',
      record_id: sliderId,
      action: 'DELETE',
      changed_by: req.user.id,
      old_values: { title: slider.title }
    });

    res.json({ message: 'Slider deleted successfully' });
  } catch (error) {
    console.error('Error deleting slider:', error);
    res.status(500).json({ error: 'Failed to delete slider' });
  }
};

// ==================== POSTERS ====================
export const listPosters = async (req, res) => {
  try {
    const { page = 1, limit = 50, is_active, poster_type, priority } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (is_active !== undefined) filter.is_active = is_active === 'true';
    if (poster_type) filter.poster_type = poster_type;
    if (priority) filter.priority = priority;

    const posters = await Poster.find(filter)
      .sort({ is_pinned: -1, priority: -1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('created_by', 'username email')
      .populate('updated_by', 'username email')
      .populate('target_classes', 'class_name');

    const total = await Poster.countDocuments(filter);

    res.json({
      posters,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error listing posters:', error);
    res.status(500).json({ error: 'Failed to fetch posters' });
  }
};

export const createPoster = async (req, res) => {
  try {
    const posterData = {
      ...req.body,
      created_by: req.user.id,
      updated_by: req.user.id
    };

    const poster = new Poster(posterData);
    await poster.save();

    // Audit log
    await AuditLog.create({
      table_name: 'posters',
      record_id: poster._id.toString(),
      action: 'CREATE',
      changed_by: req.user.id,
      new_values: { title: poster.title, type: poster.poster_type }
    });

    res.status(201).json({ poster, message: 'Poster created successfully' });
  } catch (error) {
    console.error('Error creating poster:', error);
    res.status(500).json({ error: 'Failed to create poster' });
  }
};

export const updatePoster = async (req, res) => {
  try {
    const { posterId } = req.params;
    const updates = {
      ...req.body,
      updated_by: req.user.id
    };

    const poster = await Poster.findByIdAndUpdate(
      posterId,
      updates,
      { new: true, runValidators: true }
    );

    if (!poster) {
      return res.status(404).json({ error: 'Poster not found' });
    }

    // Audit log
    await AuditLog.create({
      table_name: 'posters',
      record_id: poster._id.toString(),
      action: 'UPDATE',
      changed_by: req.user.id,
      new_values: updates
    });

    res.json({ poster, message: 'Poster updated successfully' });
  } catch (error) {
    console.error('Error updating poster:', error);
    res.status(500).json({ error: 'Failed to update poster' });
  }
};

export const deletePoster = async (req, res) => {
  try {
    const { posterId } = req.params;

    const poster = await Poster.findByIdAndDelete(posterId);

    if (!poster) {
      return res.status(404).json({ error: 'Poster not found' });
    }

    // Audit log
    await AuditLog.create({
      table_name: 'posters',
      record_id: posterId,
      action: 'DELETE',
      changed_by: req.user.id,
      old_values: { title: poster.title }
    });

    res.json({ message: 'Poster deleted successfully' });
  } catch (error) {
    console.error('Error deleting poster:', error);
    res.status(500).json({ error: 'Failed to delete poster' });
  }
};

// ==================== ADVERTISEMENTS ====================
export const listAds = async (req, res) => {
  try {
    const { page = 1, limit = 50, is_active, ad_type, placement } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (is_active !== undefined) filter.is_active = is_active === 'true';
    if (ad_type) filter.ad_type = ad_type;
    if (placement) filter.placement = placement;

    const ads = await Advertisement.find(filter)
      .sort({ placement: 1, display_order: 1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('created_by', 'username email')
      .populate('updated_by', 'username email');

    const total = await Advertisement.countDocuments(filter);

    res.json({
      ads,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error listing ads:', error);
    res.status(500).json({ error: 'Failed to fetch advertisements' });
  }
};

export const createAd = async (req, res) => {
  try {
    const adData = {
      ...req.body,
      created_by: req.user.id,
      updated_by: req.user.id
    };

    const ad = new Advertisement(adData);
    await ad.save();

    // Audit log
    await AuditLog.create({
      table_name: 'advertisements',
      record_id: ad._id.toString(),
      action: 'CREATE',
      changed_by: req.user.id,
      new_values: { title: ad.title, type: ad.ad_type }
    });

    res.status(201).json({ ad, message: 'Advertisement created successfully' });
  } catch (error) {
    console.error('Error creating ad:', error);
    res.status(500).json({ error: 'Failed to create advertisement' });
  }
};

export const updateAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const updates = {
      ...req.body,
      updated_by: req.user.id
    };

    const ad = await Advertisement.findByIdAndUpdate(
      adId,
      updates,
      { new: true, runValidators: true }
    );

    if (!ad) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }

    // Audit log
    await AuditLog.create({
      table_name: 'advertisements',
      record_id: ad._id.toString(),
      action: 'UPDATE',
      changed_by: req.user.id,
      new_values: updates
    });

    res.json({ ad, message: 'Advertisement updated successfully' });
  } catch (error) {
    console.error('Error updating ad:', error);
    res.status(500).json({ error: 'Failed to update advertisement' });
  }
};

export const deleteAd = async (req, res) => {
  try {
    const { adId } = req.params;

    const ad = await Advertisement.findByIdAndDelete(adId);

    if (!ad) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }

    // Audit log
    await AuditLog.create({
      table_name: 'advertisements',
      record_id: adId,
      action: 'DELETE',
      changed_by: req.user.id,
      old_values: { title: ad.title }
    });

    res.json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    console.error('Error deleting ad:', error);
    res.status(500).json({ error: 'Failed to delete advertisement' });
  }
};

// ==================== SUCCESS STORIES ====================
export const listSuccessStories = async (req, res) => {
  try {
    const { page = 1, limit = 50, is_active, category } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (is_active !== undefined) filter.is_active = is_active === 'true';
    if (category) filter.category = category;

    const stories = await SuccessStory.find(filter)
      .sort({ display_order: 1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('created_by', 'username email')
      .populate('updated_by', 'username email');

    const total = await SuccessStory.countDocuments(filter);

    res.json({
      stories,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error listing success stories:', error);
    res.status(500).json({ error: 'Failed to fetch success stories' });
  }
};

export const createSuccessStory = async (req, res) => {
  try {
    const storyData = {
      ...req.body,
      created_by: req.user.id,
      updated_by: req.user.id
    };

    const story = new SuccessStory(storyData);
    await story.save();

    // Audit log
    await AuditLog.create({
      table_name: 'success_stories',
      record_id: story._id.toString(),
      action: 'CREATE',
      changed_by: req.user.id,
      new_values: { title: story.title, category: story.category }
    });

    res.status(201).json({ story, message: 'Success story created successfully' });
  } catch (error) {
    console.error('Error creating success story:', error);
    res.status(500).json({ error: 'Failed to create success story' });
  }
};

export const updateSuccessStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const updates = {
      ...req.body,
      updated_by: req.user.id
    };

    const story = await SuccessStory.findByIdAndUpdate(
      storyId,
      updates,
      { new: true, runValidators: true }
    );

    if (!story) {
      return res.status(404).json({ error: 'Success story not found' });
    }

    // Audit log
    await AuditLog.create({
      table_name: 'success_stories',
      record_id: story._id.toString(),
      action: 'UPDATE',
      changed_by: req.user.id,
      new_values: updates
    });

    res.json({ story, message: 'Success story updated successfully' });
  } catch (error) {
    console.error('Error updating success story:', error);
    res.status(500).json({ error: 'Failed to update success story' });
  }
};

export const deleteSuccessStory = async (req, res) => {
  try {
    const { storyId } = req.params;

    const story = await SuccessStory.findByIdAndDelete(storyId);

    if (!story) {
      return res.status(404).json({ error: 'Success story not found' });
    }

    // Audit log
    await AuditLog.create({
      table_name: 'success_stories',
      record_id: storyId,
      action: 'DELETE',
      changed_by: req.user.id,
      old_values: { title: story.title }
    });

    res.json({ message: 'Success story deleted successfully' });
  } catch (error) {
    console.error('Error deleting success story:', error);
    res.status(500).json({ error: 'Failed to delete success story' });
  }
};

// ==================== VIDEOS ====================
export const listVideos = async (req, res) => {
  try {
    const { page = 1, limit = 50, is_active } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (is_active !== undefined) filter.is_active = is_active === 'true';

    const videos = await Video.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Video.countDocuments(filter);

    res.json({
      videos,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
};

export const createVideo = async (req, res) => {
  try {
    const { title, description, video_url, thumbnail_url, is_active } = req.body;

    const video = await Video.create({
      title,
      description,
      video_url,
      thumbnail_url,
      is_active: is_active !== undefined ? is_active : true
    });

    // Audit log
    await AuditLog.create({
      table_name: 'videos',
      record_id: video._id,
      action: 'CREATE',
      changed_by: req.user.id,
      new_values: { title, video_url }
    });

    res.status(201).json({ video, message: 'Video created successfully' });
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: 'Failed to create video' });
  }
};

export const updateVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title, description, video_url, thumbnail_url, is_active } = req.body;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const oldValues = { title: video.title, video_url: video.video_url };

    video.title = title || video.title;
    video.description = description || video.description;
    video.video_url = video_url || video.video_url;
    video.thumbnail_url = thumbnail_url !== undefined ? thumbnail_url : video.thumbnail_url;
    video.is_active = is_active !== undefined ? is_active : video.is_active;

    await video.save();

    // Audit log
    await AuditLog.create({
      table_name: 'videos',
      record_id: videoId,
      action: 'UPDATE',
      changed_by: req.user.id,
      old_values: oldValues,
      new_values: { title, video_url }
    });

    res.json({ video, message: 'Video updated successfully' });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    await Video.findByIdAndDelete(videoId);

    // Audit log
    await AuditLog.create({
      table_name: 'videos',
      record_id: videoId,
      action: 'DELETE',
      changed_by: req.user.id,
      old_values: { title: video.title }
    });

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
};

// ==================== ANALYTICS ====================
export const getContentStats = async (req, res) => {
  try {
    const [slidersCount, postersCount, adsCount, storiesCount, videosCount] = await Promise.all([
      Slider.countDocuments({ is_active: true }),
      Poster.countDocuments({ is_active: true }),
      Advertisement.countDocuments({ is_active: true }),
      SuccessStory.countDocuments({ is_active: true }),
      Video.countDocuments({ is_active: true })
    ]);

    res.json({
      stats: {
        active_sliders: slidersCount,
        active_posters: postersCount,
        active_ads: adsCount,
        active_stories: storiesCount,
        active_videos: videosCount
      }
    });
  } catch (error) {
    console.error('Error fetching content stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};
