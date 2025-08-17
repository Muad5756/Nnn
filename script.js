// JavaScript logic separated from HTML for the Student GPA Calculator.

// Mapping from letter grades to GPA points
const gradeToGPA = {
    'F': 0, 'D': 0.5, 'DD': 1, 'C': 1.5, 'CC': 2,
    'B': 2.5, 'BB': 3, 'A': 3.5, 'AA': 4
};

// Courses and credit units for Semester 1
const sem1 = [
    { name: "Math1", units: 12 },
    { name: "Physics1", units: 12 },
    { name: "English1", units: 9 },
    { name: "Statistics", units: 9 },
    { name: "Arabic", units: 6 },
    { name: "Computer", units: 9 }
];

// Courses and credit units for Semester 2
const sem2 = [
    { name: "Math2", units: 12 },
    { name: "Physics2", units: 12 },
    { name: "Chemistry", units: 9 },
    { name: "Drawing", units: 6 },
    { name: "English2", units: 9 }
];

// Mapping of pastebin raw URLs for each course (old/new where applicable)
const pastebinLinks = {
    'Math1_old': 'https://pastebin.com/raw/4WscJMh0',
    'Math1_new': 'https://pastebin.com/raw/1NcsJK7g',
    'Physics1_old': 'https://pastebin.com/raw/VsZXLGnF',
    'Physics1_new': 'https://pastebin.com/raw/XZeQHFSs',
    'English1_old': 'https://pastebin.com/raw/AxmBtNeE',
    'English1_new': 'https://pastebin.com/raw/ZZsjVX30',
    'Statistics_old': 'https://pastebin.com/raw/DY08wqAx',
    'Statistics_new': 'https://pastebin.com/raw/2WeYNGM2',
    'Arabic_old': 'https://pastebin.com/raw/pUdtTdDC',
    'Arabic_new': 'https://pastebin.com/raw/S5R0pKKn',
    'Computer_old': 'https://pastebin.com/raw/xM78SjCp',
    'Computer_new': 'https://pastebin.com/raw/8fZNVW1s',
    'Math2': 'https://pastebin.com/raw/eSiuC5ML',
    'Physics2': 'https://pastebin.com/raw/e3FQwB9q',
    'Chemistry': 'https://pastebin.com/raw/izG7PzL5',
    'Drawing': 'https://pastebin.com/raw/QGnc3Duj',
    'English2': 'https://pastebin.com/raw/yBdzjstv'
};

/**
 * Fetch grade data from a Pastebin raw URL, trying multiple CORS proxies if needed.
 * @param {string} url - The raw Pastebin URL to fetch.
 * @returns {Promise<Object>} An object containing the parsed grades, the raw text, and any errors.
 */
async function fetchGradeData(url) {
    try {
        // Try multiple CORS proxy services
        const proxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://cors-anywhere.herokuapp.com/',
            '' // Direct fetch as fallback
        ];
        
        let response, text;
        let lastError;
        
        for (const proxy of proxies) {
            try {
                const proxyUrl = proxy + encodeURIComponent(url);
                console.log(`Trying to fetch from: ${proxyUrl}`);
                
                response = await fetch(proxyUrl);
                if (response.ok) {
                    text = await response.text();
                    console.log(`Success with proxy: ${proxy}`);
                    break;
                }
            } catch (error) {
                console.log(`Failed with proxy ${proxy}:`, error.message);
                lastError = error;
                continue;
            }
        }
        
        if (!text) {
            throw lastError || new Error('All proxy attempts failed');
        }
        
        const grades = {};
        
        // Debug: Log the raw text
        console.log(`Data from ${url}:`, text.substring(0, 200) + '...');
        
        const lines = text.split('\n');
        lines.forEach((line) => {
            const trimmed = line.trim();
            if (trimmed && trimmed.includes(':')) {
                const parts = trimmed.split(':');
                if (parts.length >= 2) {
                    const studentNum = parts[0].trim();
                    const grade = parts[1].trim();
                    if (studentNum && grade) {
                        grades[studentNum] = grade;
                    }
                }
            } else if (trimmed && /^\d+\s+[A-Z]+$/.test(trimmed)) {
                // Handle format like "33039 AA" (space separated)
                const parts = trimmed.split(/\s+/);
                if (parts.length >= 2) {
                    const studentNum = parts[0].trim();
                    const grade = parts[1].trim();
                    if (studentNum && grade) {
                        grades[studentNum] = grade;
                    }
                }
            }
        });
        
        // Debug: Log found grades
        console.log(`Grades found in ${url}:`, Object.keys(grades).length, 'students');
        
        return { grades, rawText: text, url };
    } catch (error) {
        console.error('Error fetching data from:', url, error);
        return { grades: {}, rawText: '', url, error: error.message };
    }
}

/**
 * Retrieve the grade for a student in a given subject, checking old/new systems where applicable.
 * @param {string} subject - The subject name.
 * @param {string} studentNumber - The student's ID.
 * @returns {Promise<Object>} The grade, the system it came from, and the raw data used.
 */
async function getStudentGrade(subject, studentNumber) {
    // For semester 1 subjects, check both old and new systems
    if (sem1.some(s => s.name === subject)) {
        const newData = await fetchGradeData(pastebinLinks[`${subject}_new`]);
        const oldData = await fetchGradeData(pastebinLinks[`${subject}_old`]);
        
        // If student exists in new system, use new grade
        if (newData.grades[studentNumber]) {
            return { grade: newData.grades[studentNumber], system: 'New', data: newData };
        }
        // Otherwise, use old system if available
        if (oldData.grades[studentNumber]) {
            return { grade: oldData.grades[studentNumber], system: 'Old', data: oldData };
        }
        return { grade: null, system: null, data: { newData, oldData } };
    } else {
        // For semester 2 subjects, only one system
        const data = await fetchGradeData(pastebinLinks[subject]);
        if (data.grades[studentNumber]) {
            return { grade: data.grades[studentNumber], system: 'Current', data };
        }
        return { grade: null, system: null, data };
    }
}

/**
 * Compute the GPA for a given list of subjects and a mapping of grades.
 * @param {Array} subjects - List of subjects with their unit values.
 * @param {Object} grades - Mapping of subject names to gradeInfo objects.
 * @returns {string|null} The calculated GPA to two decimals, or null if no courses found.
 */
function calculateSemesterGPA(subjects, grades) {
    let totalPoints = 0;
    let totalUnits = 0;
    
    subjects.forEach(subject => {
        const gradeInfo = grades[subject.name];
        if (gradeInfo && gradeToGPA[gradeInfo.grade] !== undefined) {
            totalPoints += gradeToGPA[gradeInfo.grade] * subject.units;
            totalUnits += subject.units;
        }
    });
    
    return totalUnits > 0 ? (totalPoints / totalUnits).toFixed(2) : null;
}

/**
 * Render the results on the page, including each semester's courses and GPA.
 * @param {Object} sem1Grades - Semester 1 grades keyed by subject name.
 * @param {Object} sem2Grades - Semester 2 grades keyed by subject name.
 */
function displayResults(sem1Grades, sem2Grades) {
    const sem1Results = document.getElementById('sem1Results');
    const sem2Results = document.getElementById('sem2Results');
    const sem1Section = sem1Results.closest('.mb-8');
    const sem2Section = sem2Results.closest('.mb-8');
    
    // Display Semester 1 results
    sem1Results.innerHTML = '';
    let sem1HasCourses = false;
    sem1.forEach(subject => {
        const gradeInfo = sem1Grades[subject.name];
        if (gradeInfo) {
            sem1HasCourses = true;
            const gpaPoints = gradeToGPA[gradeInfo.grade] || 0;
            
            sem1Results.innerHTML += `
                <div class="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span class="text-white font-medium">${subject.name}</span>
                    <div class="text-right">
                        <span class="text-blue-200">${gradeInfo.grade} (${gradeInfo.system})</span>
                        <span class="text-gray-300 text-sm ml-2">(${gpaPoints} pts)</span>
                    </div>
                </div>
            `;
        }
    });
    
    // Show/hide semester 1 section
    if (sem1HasCourses) {
        sem1Section.style.display = 'block';
    } else {
        sem1Section.style.display = 'none';
    }
    
    // Display Semester 2 results
    sem2Results.innerHTML = '';
    let sem2HasCourses = false;
    sem2.forEach(subject => {
        const gradeInfo = sem2Grades[subject.name];
        if (gradeInfo) {
            sem2HasCourses = true;
            const gpaPoints = gradeToGPA[gradeInfo.grade] || 0;
            
            sem2Results.innerHTML += `
                <div class="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span class="text-white font-medium">${subject.name}</span>
                    <div class="text-right">
                        <span class="text-blue-200">${gradeInfo.grade}</span>
                        <span class="text-gray-300 text-sm ml-2">(${gpaPoints} pts)</span>
                    </div>
                </div>
            `;
        }
    });
    
    // Show/hide semester 2 section
    if (sem2HasCourses) {
        sem2Section.style.display = 'block';
    } else {
        sem2Section.style.display = 'none';
    }
    
    // Calculate and display GPAs
    const sem1GPA = calculateSemesterGPA(sem1, sem1Grades);
    const sem2GPA = calculateSemesterGPA(sem2, sem2Grades);
    
    // Display semester GPAs
    document.getElementById('sem1GPA').textContent = sem1GPA || 'No courses available';
    document.getElementById('sem2GPA').textContent = sem2GPA || 'No courses available';
    
    // Calculate overall GPA based on available semesters only
    let overallGPA = '0.00';
    if (sem1GPA && sem2GPA) {
        // Both semesters have courses
        const sem1Units = sem1.reduce((sum, s) => {
            return sem1Grades[s.name] ? sum + s.units : sum;
        }, 0);
        const sem2Units = sem2.reduce((sum, s) => {
            return sem2Grades[s.name] ? sum + s.units : sum;
        }, 0);
        overallGPA = ((parseFloat(sem1GPA) * sem1Units + parseFloat(sem2GPA) * sem2Units) / (sem1Units + sem2Units)).toFixed(2);
    } else if (sem1GPA) {
        // Only semester 1 has courses (first semester student)
        overallGPA = sem1GPA;
    } else if (sem2GPA) {
        // Only semester 2 has courses
        overallGPA = sem2GPA;
    }
    
    document.getElementById('overallGPA').textContent = overallGPA;
}

/**
 * Main function triggered to calculate and display a student's GPA.
 */
async function calculateGPA() {
    const studentNumberElement = document.getElementById('studentNumber');
    const studentNumber = studentNumberElement ? studentNumberElement.value.trim() : '';
    
    if (!studentNumber) {
        showError('Please enter a student number');
        return;
    }
    
    // Privacy protection for specific student
    if (studentNumber === '33039') {
        alert('This student has requested privacy protection and their grades cannot be displayed.');
        return;
    }
    
    // Show loading
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    
    try {
        const sem1Grades = {};
        const sem2Grades = {};
        const debugInfo = [];
        
        // Fetch grades for semester 1
        for (const subject of sem1) {
            const gradeInfo = await getStudentGrade(subject.name, studentNumber);
            debugInfo.push(`${subject.name}: ${gradeInfo.grade || 'Not Found'} (${gradeInfo.system || 'N/A'})`);
            if (gradeInfo.grade) {
                sem1Grades[subject.name] = gradeInfo;
            }
        }
        
        // Fetch grades for semester 2
        for (const subject of sem2) {
            const gradeInfo = await getStudentGrade(subject.name, studentNumber);
            debugInfo.push(`${subject.name}: ${gradeInfo.grade || 'Not Found'}`);
            if (gradeInfo.grade) {
                sem2Grades[subject.name] = gradeInfo;
            }
        }
        
        console.log('Debug info for student', studentNumber, ':', debugInfo);
        
        // Check if any grades were found
        if (Object.keys(sem1Grades).length === 0 && Object.keys(sem2Grades).length === 0) {
            showError(`No grades found for student number: ${studentNumber}. Please check if your student number is correct.\n\nDebug info:\n${debugInfo.join('\n')}`);
            return;
        }
        
        // Display results
        displayResults(sem1Grades, sem2Grades);
        document.getElementById('results').classList.remove('hidden');
        
    } catch (error) {
        showError(`Error calculating GPA: ${error.message}. Please try again.`);
        console.error('Error:', error);
    } finally {
        document.getElementById('loading').classList.add('hidden');
    }
}

/**
 * Display an error message to the user.
 * @param {string} message - The error message to display.
 */
function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
}

// Attach event listeners once the DOM has fully loaded
document.addEventListener('DOMContentLoaded', function () {
    // Allow Enter key to trigger calculation
    const studentInput = document.getElementById('studentNumber');
    if (studentInput) {
        studentInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                calculateGPA();
            }
        });
    }
    // Attach click handler to the calculate button
    const button = document.getElementById('calculateButton');
    if (button) {
        button.addEventListener('click', calculateGPA);
    }
});

// Cloudflare injected script kept for parity with the original HTML
(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'9709d754b701ee8f',t:'MTc1NTQ0MDczMC4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b); 'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();