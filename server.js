require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// JSearch API credentials
const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY;
const BASE_URL = 'https://jsearch.p.rapidapi.com';

// Middleware
const corsOptions = {
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
    methods: 'GET',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint for job search
app.get('/api/jobs', async (req, res) => {
    try {
        const { 
            title, 
            location, 
            salary_min, 
            salary_max, 
            full_time, 
            part_time, 
            contract, 
            remote, 
            sort_by 
        } = req.query;

        // Build query parameters for JSearch
        const query = title || '';
        const employmentTypes = [];
        
        if (full_time === 'true') employmentTypes.push('FULLTIME');
        if (part_time === 'true') employmentTypes.push('PARTTIME');
        if (contract === 'true') employmentTypes.push('CONTRACTOR');
        if (remote === 'true') employmentTypes.push('INTERN', 'OTHER');

        const params = {
            query: query,
            page: '1',
            num_pages: '1',
            ...(location && { location: location }),
            ...(salary_min && { salary_min: salary_min }),
            ...(salary_max && { salary_max: salary_max }),
            ...(employmentTypes.length > 0 && { employment_types: employmentTypes.join(',') }),
            ...(sort_by && { sort_by: sort_by === 'date' ? 'date_posted' : 'relevance' })
        };

        const options = {
            method: 'GET',
            url: `${BASE_URL}/search`,
            params: params,
            headers: {
                'X-RapidAPI-Key': JSEARCH_API_KEY,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        res.json(response.data.data || []);
    } catch (error) {
        console.error('Error fetching jobs:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to fetch jobs',
            details: error.response?.data || error.message 
        });
    }
});

// Proxy endpoint for job details
app.get('/api/job/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const options = {
            method: 'GET',
            url: `${BASE_URL}/job-details`,
            params: {
                job_id: id,
                extended_publisher_details: 'false'
            },
            headers: {
                'X-RapidAPI-Key': JSEARCH_API_KEY,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        res.json(response.data.data[0] || {});
    } catch (error) {
        console.error('Error fetching job details:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to fetch job details',
            details: error.response?.data || error.message 
        });
    }
});

// Serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});