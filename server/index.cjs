require('dotenv/config');
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.cjs');
const expenseRoutes = require('./routes/expenses.cjs');
const semesterRoutes = require('./routes/semesters.cjs');
const loanRoutes = require('./routes/loans.cjs');
const settingsRoutes = require('./routes/settings.cjs');
const adminRoutes = require('./routes/admin.cjs');
const coachingRoutes = require('./routes/coaching.cjs');
const batchRoutes = require('./routes/batches.cjs');
const tutorRoutes = require('./routes/tutors.cjs');
const clubRoutes = require('./routes/clubs.cjs');
const eventRoutes = require('./routes/events.cjs');
const uniformRoutes = require('./routes/uniforms.cjs');
const educationFeeRoutes = require('./routes/educationFees.cjs');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coaching', coachingRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/tutors', tutorRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/uniforms', uniformRoutes);
app.use('/api/education-fees', educationFeeRoutes);

// In production, serve the Vite build
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`EduTrack server running on port ${PORT}`);
});

module.exports = app;
