// backend/controllers/contentController.js
import Slider from '../models/Slider.js';
import Poster from '../models/Poster.js';
import Advertisement from '../models/Advertisement.js';
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
      user: req.user.id,
      action: 'CREATE',
      resource_type: 'Slider',
      resource_id: slider._id,
      details: { title: slider.title }
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
      user: req.user.id,
      action: 'UPDATE',
      resource_type: 'Slider',
      resource_id: slider._id,
      details: { updates }
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
      user: req.user.id,
      action: 'DELETE',
      resource_type: 'Slider',
      resource_id: sliderId,
      details: { title: slider.title }
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
      user: req.user.id,
      action: 'CREATE',
      resource_type: 'Poster',
      resource_id: poster._id,
      details: { title: poster.title, type: poster.poster_type }
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
      user: req.user.id,
      action: 'UPDATE',
      resource_type: 'Poster',
      resource_id: poster._id,
      details: { updates }
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
      user: req.user.id,
      action: 'DELETE',
      resource_type: 'Poster',
      resource_id: posterId,
      details: { title: poster.title }
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
      user: req.user.id,
      action: 'CREATE',
      resource_type: 'Advertisement',
      resource_id: ad._id,
      details: { title: ad.title, type: ad.ad_type }
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
      user: req.user.id,
      action: 'UPDATE',
      resource_type: 'Advertisement',
      resource_id: ad._id,
      details: { updates }
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
      user: req.user.id,
      action: 'DELETE',
      resource_type: 'Advertisement',
      resource_id: adId,
      details: { title: ad.title }
    });

    res.json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    console.error('Error deleting ad:', error);
    res.status(500).json({ error: 'Failed to delete advertisement' });
  }
};

// ==================== ANALYTICS ====================
export const getContentStats = async (req, res) => {
  try {
    const [slidersCount, postersCount, adsCount] = await Promise.all([
      Slider.countDocuments({ is_active: true }),
      Poster.countDocuments({ is_active: true }),
      Advertisement.countDocuments({ is_active: true })
    ]);

    res.json({
      stats: {
        active_sliders: slidersCount,
        active_posters: postersCount,
        active_ads: adsCount
      }
    });
  } catch (error) {
    console.error('Error fetching content stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};
