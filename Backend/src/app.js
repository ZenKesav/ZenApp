const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const errorMiddleware = require('./core/middlewares/error.middleware');

// Module Routes
const authRoutes = require('./modules/auth/auth.routes');
const adminRoutes = require('./modules/admin/routes/admin.routes');
const userRoutes = require('./modules/admin/routes/user.routes');
const roleRoutes = require('./modules/admin/routes/role.routes');
const shiftRoutes = require('./modules/admin/routes/shift.routes');
const meterRoutes = require('./modules/admin/routes/meter.routes');
const assignmentRoutes = require('./modules/admin/routes/assignment.routes');
const auditRoutes = require('./modules/admin/routes/audit.routes');
const productionRoutes = require('./modules/admin/routes/production.routes');

const supervisorRoutes = require('./modules/supervisor/supervisor.routes');
const qcRoutes = require('./modules/qc/qc.routes');
const analysisRoutes = require('./modules/analysis/analysis.routes');
const uploadRoutes = require('./modules/upload/upload.routes');

const stagesMasterRoutes = require('./modules/stages/routes/stages.master.routes');
const stage04Routes = require('./modules/stages/stage04-nic-inside-print/stage04.routes');

const AnalysisController = require('./modules/analysis/analysis.controller');
const { authenticate } = require('./core/middlewares/auth.middleware');

const app = express();

// Core Middleware Configuration
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Serve Uploaded Files (QC images, PDFs, Actual Prints, templates)
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/api/v1/uploads', express.static(uploadsDir));

// Health Check API
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Zenmeter Enterprise MES API Engine',
    version: '2.0.0',
    timestamp: new Date()
  });
});

// Domain Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/shifts', shiftRoutes);
app.use('/api/v1/meters', meterRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/production', productionRoutes);

// Supervisor & QC
app.use('/api/v1/supervisor', supervisorRoutes);
app.use('/api/v1/supervisor-test', supervisorRoutes);
app.use('/api/v1/qc', qcRoutes);
app.use('/api/v1/qc-test', qcRoutes);

// Analysis & Reports
app.use('/api/v1/analysis', analysisRoutes);
app.use('/api/v1/reports', analysisRoutes);

// Common Upload Engine
app.use('/api/v1/upload', uploadRoutes);

// Manufacturing Stages (01-11 & Master Pipeline)
app.use('/api/v1/stages', stagesMasterRoutes);

// Jig Hardware Direct Mapping (Legacy Jig -> Stage 04)
app.use('/api/v1/jig', stage04Routes);

// Dashboard / Analytics Convenience Aliases
app.get('/api/v1/attendance/history', authenticate, AnalysisController.getAttendanceHistory);
app.get('/api/v1/operator/analytics', authenticate, AnalysisController.getOperatorAnalytics);

// Global Error Handling Middleware
app.use(errorMiddleware);

module.exports = app;
