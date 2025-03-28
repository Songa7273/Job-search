document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const searchBtn = document.getElementById('search-btn');
    const jobTitleInput = document.getElementById('job-title');
    const locationInput = document.getElementById('location');
    const jobListings = document.getElementById('job-listings');
    const resultsCount = document.getElementById('results-count');
    const loadingIndicator = document.getElementById('loading-indicator');
    const toggleFiltersBtn = document.getElementById('toggle-filters');
    const filtersContainer = document.getElementById('filters-container');
    
    // Modal Elements
    const modal = document.getElementById('job-modal');
    const modalBody = document.getElementById('modal-body');
    const closeBtn = document.querySelector('.close-btn');
    
    // Toggle filters visibility
    toggleFiltersBtn.addEventListener('click', function() {
        filtersContainer.classList.toggle('show');
    });
    
    // Search for jobs
    searchBtn.addEventListener('click', searchJobs);
    
    // Also search when pressing Enter in input fields
    jobTitleInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchJobs();
    });
    
    locationInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchJobs();
    });
    
    // Close modal when clicking X
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Main search function
    function searchJobs() {
        const title = jobTitleInput.value.trim();
        const location = locationInput.value.trim();
        
        // Get filter values
        const salaryMin = document.getElementById('salary-min').value;
        const salaryMax = document.getElementById('salary-max').value;
        const fullTime = document.getElementById('full-time').checked;
        const partTime = document.getElementById('part-time').checked;
        const contract = document.getElementById('contract').checked;
        const remote = document.getElementById('remote').checked;
        const sortBy = document.getElementById('sort-by').value;
        
        // Validate inputs
        if (!title && !location) {
            showError('Please enter a job title or location');
            return;
        }
        
        // Show loading indicator
        loadingIndicator.style.display = 'flex';
        jobListings.innerHTML = '';
        resultsCount.textContent = 'Searching...';
        
        // Build query parameters
        const params = new URLSearchParams();
        if (title) params.append('title', title);
        if (location) params.append('location', location);
        if (salaryMin) params.append('salary_min', salaryMin);
        if (salaryMax) params.append('salary_max', salaryMax);
        if (fullTime) params.append('full_time', true);
        if (partTime) params.append('part_time', true);
        if (contract) params.append('contract', true);
        if (remote) params.append('remote', true);
        if (sortBy) params.append('sort_by', sortBy);
        
        // Fetch jobs from our backend
        fetch(`http://localhost:3000/api/jobs?${params.toString()}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { 
                        throw new Error(err.error || 'Failed to fetch jobs');
                    });
                }
                return response.json();
            })
            .then(data => {
                // Handle JSearch API response format
                const validJobs = Array.isArray(data) ? 
                    data.filter(job => job && job.job_title) : [];
                
                if (validJobs.length === 0) {
                    showNoResultsMessage(title, location);
                } else {
                    displayJobs(validJobs);
                    resultsCount.textContent = `${validJobs.length} Jobs Found`;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showError(error.message || 'Failed to load jobs. Please try again later.');
                resultsCount.textContent = '0 Jobs Found';
            })
            .finally(() => {
                loadingIndicator.style.display = 'none';
            });
    }
    
    // Display jobs
    function displayJobs(jobs) {
        jobListings.innerHTML = '';
        jobs.forEach(job => {
            const jobCard = createJobCard(job);
            jobListings.appendChild(jobCard);
        });
    }
    
    // Create job card for JSearch API format
    function createJobCard(job) {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';
        
        // Extract job details with fallbacks for JSearch format
        const title = job.job_title || 'Job Title Not Available';
        const company = job.employer_name || 'Company Not Specified';
        const location = [
            job.job_city, 
            job.job_state, 
            job.job_country
        ].filter(Boolean).join(', ') || 'Location not specified';
        
        const description = cleanDescription(
            job.job_description || 
            (job.job_highlights?.items?.join(' ') || 'No description available')
        );
        
        const salary = formatSalary(
            job.job_min_salary, 
            job.job_max_salary, 
            job.job_salary_currency
        );
        
        const date = job.job_posted_at_datetime_utc ? 
            formatDate(job.job_posted_at_datetime_utc) : 'Date not available';
        
        jobCard.innerHTML = `
            <h3 class="job-title">${title}</h3>
            <p class="job-company">${company}</p>
            <p class="job-location"><i class="fas fa-map-marker-alt"></i> ${location}</p>
            ${salary ? `<p class="job-salary">${salary}</p>` : ''}
            <p class="job-description">${truncateText(description, 200)}</p>
            <p class="job-date">Posted ${date}</p>
        `;
        
        // Make clickable if we have enough data
        if (job.job_id || job.job_apply_link) {
            jobCard.addEventListener('click', () => {
                if (job.job_id) {
                    showJobDetails(job.job_id);
                } else if (job.job_apply_link) {
                    window.open(job.job_apply_link, '_blank');
                }
            });
            jobCard.style.cursor = 'pointer';
            jobCard.classList.add('clickable-job');
        }
        
        return jobCard;
    }
    
    // Show job details in modal
    function showJobDetails(jobId) {
        loadingIndicator.style.display = 'flex';
        modalBody.innerHTML = '';
        
        fetch(`http://localhost:3000/api/job/${jobId}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw err; });
                }
                return response.json();
            })
            .then(job => {
                if (!job || typeof job !== 'object') {
                    throw new Error('Invalid job data received');
                }
                modalBody.innerHTML = createJobDetailsHTML(job);
                modal.style.display = 'block';
            })
            .catch(error => {
                console.error('Error:', error);
                modalBody.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load job details</p>
                        <small>${error.message}</small>
                    </div>
                `;
                modal.style.display = 'block';
            })
            .finally(() => {
                loadingIndicator.style.display = 'none';
            });
    }
    
    // Create job details HTML for JSearch format
    function createJobDetailsHTML(job) {
        const title = job.job_title || 'Job Title Not Available';
        const company = job.employer_name || 'Company Not Specified';
        const location = [
            job.job_city, 
            job.job_state, 
            job.job_country
        ].filter(Boolean).join(', ') || 'Location not specified';
        
        const description = cleanDescription(
            job.job_description || 
            (job.job_highlights?.items?.join('\n\n') || 'No description available')
        );
        
        const salary = formatSalary(
            job.job_min_salary, 
            job.job_max_salary, 
            job.job_salary_currency
        );
        
        const date = job.job_posted_at_datetime_utc ? 
            formatDate(job.job_posted_at_datetime_utc) : 'Date not available';
        
        const employmentType = job.job_employment_type ?
            formatEmploymentType(job.job_employment_type) : 'Not specified';
        
        return `
            <h2 class="modal-job-title">${title}</h2>
            <p class="modal-job-company">${company}</p>
            
            <div class="modal-job-meta">
                <div><i class="fas fa-map-marker-alt"></i> ${location}</div>
                ${salary ? `<div><i class="fas fa-money-bill-wave"></i> ${salary}</div>` : ''}
                <div><i class="fas fa-file-contract"></i> ${employmentType}</div>
                <div><i class="fas fa-calendar-alt"></i> Posted ${date}</div>
            </div>
            
            <div class="modal-job-description">
                <h3>Job Description</h3>
                <p>${description}</p>
                ${job.job_highlights?.items?.length ? `
                    <h3>Highlights</h3>
                    <ul>
                        ${job.job_highlights.items.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
            
            ${job.job_apply_link ? `
                <div class="modal-actions">
                    <a href="${job.job_apply_link}" target="_blank" class="modal-apply-btn">
                        <i class="fas fa-external-link-alt"></i> Apply Now
                    </a>
                </div>
            ` : ''}
        `;
    }
    
    // Helper functions
    function showError(message) {
        jobListings.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }
    
    function showNoResultsMessage(title, location) {
        let message = 'No jobs found';
        if (title && location) {
            message = `No "${title}" jobs found in ${location}`;
        } else if (title) {
            message = `No "${title}" jobs found`;
        } else if (location) {
            message = `No jobs found in ${location}`;
        }
        
        jobListings.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>${message}</p>
                <small>Try different search terms or filters</small>
            </div>
        `;
    }
    
    function formatSalary(min, max, currency = 'USD') {
        if (!min && !max) return '';
        
        const format = value => value ? `${currency} ${Math.round(value).toLocaleString()}` : '';
        const minFormatted = format(min);
        const maxFormatted = format(max);
        
        if (minFormatted && maxFormatted) {
            return `${minFormatted} - ${maxFormatted}`;
        }
        return minFormatted || maxFormatted || '';
    }
    
    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } catch (e) {
            return 'Date not available';
        }
    }
    
    function formatEmploymentType(type) {
        if (!type) return 'Not specified';
        return type
            .toLowerCase()
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    function cleanDescription(description) {
        if (!description) return 'No description available';
        // Remove HTML tags and extra whitespace
        return description
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    function truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
});