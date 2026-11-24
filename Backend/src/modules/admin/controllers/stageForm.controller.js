const fs = require('fs');
const path = require('path');
const StageFormModel = require('../models/stageForm.model');

const ACTUAL_PRINT_UPLOAD_DIR = path.join(__dirname, '..', '..', '..', '..', 'uploads', 'actual-print');
const ALLOWED_ACTUAL_PRINT_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf'
};

const ACTUAL_PRINT_URL_PREFIX = '/api/v1/uploads/actual-print/';

const resolveActualPrintDiskPath = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  const idx = fileUrl.indexOf(ACTUAL_PRINT_URL_PREFIX);
  if (idx === -1) return null;
  const rawSegment = fileUrl.slice(idx + ACTUAL_PRINT_URL_PREFIX.length).split('?')[0].split('#')[0];
  const safeName = path.basename(rawSegment);
  if (!safeName || safeName === '.' || safeName === '..') return null;
  const resolved = path.resolve(ACTUAL_PRINT_UPLOAD_DIR, safeName);
  const baseDir = path.resolve(ACTUAL_PRINT_UPLOAD_DIR);
  if (!resolved.startsWith(baseDir + path.sep)) return null;
  return resolved;
};

const deleteLocalActualPrintFiles = async (urls = [], excludePaths = []) => {
  const excluded = new Set(excludePaths.filter(Boolean).map((p) => path.resolve(p)));
  const targets = new Set();

  for (const url of urls) {
    const resolved = resolveActualPrintDiskPath(url);
    if (!resolved) continue;
    if (!excluded.has(resolved)) targets.add(resolved);

    const previewMatch = resolved.match(/^(.+)_preview\.(png|jpg)$/i);
    if (previewMatch) {
      const pairedPdf = `${previewMatch[1]}.pdf`;
      if (!excluded.has(pairedPdf)) targets.add(pairedPdf);
    }
  }

  await Promise.all(
    Array.from(targets).map(async (filePath) => {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        if (err && err.code !== 'ENOENT') {
          // Non-fatal cleanup
        }
      }
    })
  );
};

const StageFormController = {
  async getForms(req, res, next) {
    try {
      const { stage_number, operator_id, status } = req.query;
      const forms = await StageFormModel.getForms({ stage_number, operator_id, status });
      return res.status(200).json({
        success: true,
        count: forms.length,
        forms,
        data: forms
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async getActiveForm(req, res, next) {
    try {
      const { stage_number, operator_id } = req.query;
      const form = await StageFormModel.getActiveForm(stage_number, operator_id);
      return res.status(200).json({
        success: true,
        form,
        data: form
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async createForm(req, res, next) {
    try {
      const {
        form_id,
        stage_number,
        stage_name,
        form_title,
        batch_no,
        month_year,
        target_quantity,
        completed_quantity,
        description,
        print_config,
        assigned_operator_id,
        assigned_operator_name,
        status,
        created_by,
        updated_by
      } = req.body;

      if (!stage_number || !form_title) {
        return res.status(400).json({ success: false, message: 'stage_number and form_title are required' });
      }

      const creator = req.user?.name
        ? `${req.user.name} (${req.user.employee_id || req.user.role || 'IT'})`
        : (created_by || 'AdminIT (EMP001)');
      const updater = updated_by || creator;

      const form = await StageFormModel.createForm({
        form_id,
        stage_number,
        stage_name,
        form_title,
        batch_no,
        month_year,
        target_quantity,
        completed_quantity,
        description,
        print_config,
        assigned_operator_id,
        assigned_operator_name,
        status,
        created_by: creator,
        updated_by: updater,
        assigned_by: assigned_operator_id ? creator : null
      });

      return res.status(201).json({
        success: true,
        message: `Work Form '${form.form_id}' created successfully for Stage #${stage_number}!`,
        form,
        data: form
      });
    } catch (err) {
      const isDuplicate = err.message && (err.message.includes('already exists') || err.message.includes('duplicate'));
      return res.status(isDuplicate ? 409 : 400).json({ success: false, message: err.message });
    }
  },

  async updateForm(req, res, next) {
    try {
      const { id } = req.params;
      const updater = req.user?.name
        ? `${req.user.name} (${req.user.employee_id || req.user.role || 'IT'})`
        : (req.body.updated_by || 'AdminIT (EMP001)');

      const updated = await StageFormModel.updateForm(id, {
        ...req.body,
        updated_by: updater
      });

      return res.status(200).json({
        success: true,
        message: `Work Form '${updated.form_id}' updated successfully!`,
        form: updated,
        data: updated
      });
    } catch (err) {
      const isDuplicate = err.message && (err.message.includes('already exists') || err.message.includes('duplicate') || err.message.includes('used by another'));
      return res.status(isDuplicate ? 409 : 400).json({ success: false, message: err.message });
    }
  },

  async assignForm(req, res, next) {
    try {
      const { id } = req.params;
      const { assigned_operator_id, assigned_operator_name, status, reassigned_by } = req.body;

      const assigner = req.user?.name
        ? `${req.user.name} (${req.user.employee_id || req.user.role || 'IT'})`
        : (reassigned_by || 'AdminIT (EMP001)');

      const updated = await StageFormModel.assignForm(id, {
        assigned_operator_id,
        assigned_operator_name,
        reassigned_by: assigner,
        updated_by: assigner,
        status
      });

      const msg = assigned_operator_name
        ? `Work Form '${updated.form_id}' assigned to ${assigned_operator_name} (${assigned_operator_id}) successfully!`
        : `Work Form '${updated.form_id}' assignment updated!`;

      return res.status(200).json({
        success: true,
        message: msg,
        form: updated,
        data: updated
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async deleteForm(req, res, next) {
    try {
      const { id } = req.params;
      await StageFormModel.deleteForm(id);
      return res.status(200).json({
        success: true,
        message: `Work Form deleted successfully!`
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  async uploadActualPrintFile(req, res) {
    try {
      const {
        fileName,
        mimeType,
        dataUrl,
        previewImageDataUrl,
        formId,
        previousFileUrl,
        previousSourceUrl
      } = req.body || {};
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ success: false, message: 'File dataUrl is required.' });
      }

      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ success: false, message: 'Invalid file data format. Expected base64 Data URL.' });
      }

      const detectedMime = (match[1] || mimeType || '').toLowerCase().trim();
      const base64Body = match[2];
      const extFromMime = ALLOWED_ACTUAL_PRINT_MIME[detectedMime];
      const extFromName = (String(fileName || '').match(/\.(jpe?g|png|pdf)$/i)?.[1] || '').toLowerCase().replace('jpeg', 'jpg');
      const ext = extFromMime || extFromName;

      if (!ext || !['jpg', 'png', 'pdf'].includes(ext)) {
        return res.status(400).json({
          success: false,
          message: 'Only JPG, PNG, and PDF files are allowed.'
        });
      }

      const buffer = Buffer.from(base64Body, 'base64');
      if (!buffer.length) {
        return res.status(400).json({ success: false, message: 'Uploaded file is empty.' });
      }
      if (buffer.length > 15 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: 'File size exceeds 15MB limit.' });
      }

      await fs.promises.mkdir(ACTUAL_PRINT_UPLOAD_DIR, { recursive: true });

      const rawBase = String(fileName || `actual_print.${ext}`).replace(/\.[^/.]+$/, '');
      const safeBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'actual_print';
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const savedFileName = `${safeBase}_${uniqueSuffix}.${ext}`;
      const targetPath = path.join(ACTUAL_PRINT_UPLOAD_DIR, savedFileName);

      await fs.promises.writeFile(targetPath, buffer);

      const fileUrl = `/api/v1/uploads/actual-print/${savedFileName}`;
      const fileType = ext === 'pdf' ? 'pdf' : 'image';
      let previewUrl = fileType === 'image' ? fileUrl : null;
      let previewPath = null;

      if (fileType === 'pdf' && typeof previewImageDataUrl === 'string') {
        const previewMatch = previewImageDataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
        if (previewMatch) {
          const previewExt = previewMatch[1] === 'png' ? 'png' : 'jpg';
          const previewFileName = `${safeBase}_${uniqueSuffix}_preview.${previewExt}`;
          previewPath = path.join(ACTUAL_PRINT_UPLOAD_DIR, previewFileName);
          await fs.promises.writeFile(previewPath, Buffer.from(previewMatch[2], 'base64'));
          previewUrl = `/api/v1/uploads/actual-print/${previewFileName}`;
        }
      }

      const oldUrlsToDelete = [];
      if (previousFileUrl) oldUrlsToDelete.push(previousFileUrl);
      if (previousSourceUrl) oldUrlsToDelete.push(previousSourceUrl);

      let updatedForm = null;
      if (formId) {
        const existingForm = await StageFormModel.findByFormId(formId);
        if (existingForm) {
          if (existingForm.print_config?.actualPrintImageUrl) {
            oldUrlsToDelete.push(existingForm.print_config.actualPrintImageUrl);
          }
          if (existingForm.print_config?.actualPrintSourceUrl) {
            oldUrlsToDelete.push(existingForm.print_config.actualPrintSourceUrl);
          }
          const updater = req.user?.name
            ? `${req.user.name} (${req.user.employee_id || req.user.role || 'IT'})`
            : 'AdminIT (EMP001)';
          updatedForm = await StageFormModel.updateForm(existingForm.id || existingForm.form_id, {
            print_config: {
              ...(existingForm.print_config || {}),
              actualPrintImageUrl: previewUrl || fileUrl,
              actualPrintSourceUrl: fileUrl,
              actualPrintImageName: fileName || savedFileName,
              actualPrintFileType: fileType
            },
            updated_by: updater
          });
        }
      }

      if (oldUrlsToDelete.length > 0) {
        await deleteLocalActualPrintFiles(oldUrlsToDelete, [targetPath, previewPath]);
      }

      return res.status(201).json({
        success: true,
        message: 'Actual Print file uploaded and saved to backend.',
        fileUrl,
        previewUrl: previewUrl || fileUrl,
        fileName: fileName || savedFileName,
        savedFileName,
        fileType,
        form: updatedForm
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to save Actual Print file.' });
    }
  }
};

module.exports = StageFormController;
