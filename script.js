document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired. Initializing script logic.");
    const z = Zod;

    const apiKeyDialogEl = document.getElementById('apiKeyDialog');
    let apiKeyModalInstance; 


    if (apiKeyDialogEl) {
        apiKeyDialogEl.addEventListener('cancel', (event) => {
            if (!geminiApiKey) { 
                event.preventDefault();
            }
        });
    }


    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        apiKeyModalInstance = new bootstrap.Modal(apiKeyDialogEl, { backdrop: 'static', keyboard: false });
    } else {
        console.warn("Bootstrap Modal not available. API Key dialog might not work as expected.");
    }

    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyButton = document.getElementById('saveApiKey');
    const statusBar = document.getElementById('statusBar');

    const jobDescriptionInput = document.getElementById('jobDescriptionInput');
    const createScoringFrameworkBtn = document.getElementById('createScoringFrameworkBtn');
    const jobDescriptionOutput = document.getElementById('jobDescriptionOutput');

    const resumeFileInput = document.getElementById('resumeFileInput');
    const evaluateResumeBtn = document.getElementById('evaluateResumeBtn');
    const resumeOutput = document.getElementById('resumeOutput');
    const globalLoader = document.getElementById('globalLoader');


    function showLoader() {
        if (globalLoader) {
            globalLoader.classList.remove('d-none');
        }
    }

    function hideLoader() {
        if (globalLoader) {
            globalLoader.classList.add('d-none');
        }
    }

    let geminiApiKey = sessionStorage.getItem('geminiApiKey'); 

    hideLoader();

    function updateStatus(message) {
        statusBar.textContent = `Status: ${message}`;
        console.log(message);
    }

    if (!geminiApiKey) {
        if (apiKeyModalInstance) {
            apiKeyModalInstance.show();
        } else {
            apiKeyDialogEl.showModal(); 
        }
    }

    saveApiKeyButton.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            sessionStorage.setItem('geminiApiKey', key); 
            geminiApiKey = key;
            if (apiKeyModalInstance) {
                apiKeyModalInstance.hide();
            } else {
                apiKeyDialogEl.close(); 
            }
            updateStatus("API Key saved.");
        } else {
            alert("Please enter a valid API Key.");
        }
    });

    const SkillSchema = z.object({
        skillName: z.string(),
        type: z.enum(["hard", "soft"])
    });

    const ExperienceSchema = z.object({
        title: z.string().optional(),
        company: z.string().optional(),
        durationYears: z.number().optional(),
        description: z.string().optional()
    });

    const EducationSchema = z.object({
        degree: z.string(),
        major: z.string().nullable(),
        university: z.string(),
        graduationDate: z.string().optional(), 
    });

    const JobPostExtractedInfoSchema = z.object({
        hardSkills: z.array(z.string()),
        softSkills: z.array(z.string()),
        experienceRequirements: z.array(z.string()), 
        educationRequirements: z.array(z.string()), 
        keywords: z.array(z.string())
    });

    const JobPostCategorizedInfoSchema = z.object({
        mustHave: JobPostExtractedInfoSchema,
        niceToHave: JobPostExtractedInfoSchema
    });

    const ResumeExtractedInfoSchema = z.object({
        hardSkills: z.array(z.string()),
        softSkills: z.array(z.string()),
        totalYearsExperience: z.number(),
        education: z.array(EducationSchema),
        keywords: z.array(z.string()),
        fullText: z.string() 
    });

    function renderKeyValuePairs(data, title) {
        let html = `<h3>${title}</h3>`;
        if (typeof data === 'object' && data !== null) {
            html += '<dl class="row">'; 
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    let value = data[key];
                    if (Array.isArray(value)) {
                        value = value.join(', ');
                        if (value === '') value = '<em class="fst-italic">Not specified</em>';
                    } else if (typeof value === 'object' && value !== null) {
                        value = '<pre class="mb-0">' + JSON.stringify(value, null, 2) + '</pre>'; 
                    } else if (value === '' || value === null || value === undefined) {
                        value = '<em class="fst-italic">Not specified</em>';
                    }
                    const humanReadableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    html += `<dt class="col-sm-4">${humanReadableKey}</dt><dd class="col-sm-8">${value}</dd>`;
                }
            }
            html += '</dl>';
        } else {
            html += '<p class="mb-4">No data to display.</p>';
        }
        return html;
    }

    function renderCategorizedInfo(data, title) {
        let html = `<h3>${title}</h3>`;
        if (data && data.mustHave && data.niceToHave) {
            html += '<h4>Must-Have Requirements:</h4>';
            html += renderKeyValuePairs(data.mustHave, ''); 
            html += '<h4>Nice-to-Have Requirements:</h4>';
            html += renderKeyValuePairs(data.niceToHave, ''); 
        } else {
            html += '<p>No categorized data to display.</p>';
        }
        return html;
    }

    function renderEducation(educationArray) {
        if (!educationArray || educationArray.length === 0) return '<p><em>Not specified</em></p>';
        let html = '<ul>';
        educationArray.forEach(edu => {
            html += '<li>';
            html += `<strong>Degree:</strong> ${edu.degree || 'N/A'}<br>`;
            html += `<strong>Major:</strong> ${edu.major || 'N/A'}<br>`;
            html += `<strong>University:</strong> ${edu.university || 'N/A'}<br>`;
            if (edu.graduationDate) html += `<strong>Graduation:</strong> ${edu.graduationDate}<br>`;
            html += '</li>';
        });
        html += '</ul>';
        return html;
    }

    function renderResumeExtractedInfo(data, title) {
        let html = `<h3>${title}</h3>`;
        if (data) {
            html += '<dl class="row">';
            html += `<dt class="col-sm-4">Hard Skills</dt><dd class="col-sm-8">${data.hardSkills && data.hardSkills.length > 0 ? data.hardSkills.join(', ') : '<em class="fst-italic">Not specified</em>'}</dd>`;
            html += `<dt class="col-sm-4">Soft Skills</dt><dd class="col-sm-8">${data.softSkills && data.softSkills.length > 0 ? data.softSkills.join(', ') : '<em class="fst-italic">Not specified</em>'}</dd>`;
            html += `<dt class="col-sm-4">Total Years Experience</dt><dd class="col-sm-8">${data.totalYearsExperience !== undefined ? data.totalYearsExperience : '<em class="fst-italic">Not specified</em>'}</dd>`;
            html += `<dt class="col-sm-4">Keywords</dt><dd class="col-sm-8">${data.keywords && data.keywords.length > 0 ? data.keywords.join(', ') : '<em class="fst-italic">Not specified</em>'}</dd>`;
            html += '<dt class="col-sm-4">Education</dt><dd class="col-sm-8">' + renderEducation(data.education) + '</dd>';
            html += '</dl>';
        } else {
            html += '<p>No extracted resume data to display.</p>';
        }
        return html;
    }

    function renderEvaluationScores(data, title) {
        let html = `<h3>${title}</h3>`;
        if (data) {
            html += '<dl class="row">';
            if (data.experienceMatch) {
                html += `<dt class="col-sm-4">Experience Match</dt><dd class="col-sm-8"><strong>Score:</strong> ${data.experienceMatch.score}/10 <br> <em>${data.experienceMatch.justification || ''}</em></dd>`;
            }
            if (data.educationMatch) {
                html += `<dt class="col-sm-4">Education Match</dt><dd class="col-sm-8"><strong>Score:</strong> ${data.educationMatch.score}/10 <br> <em>${data.educationMatch.justification || ''}</em></dd>`;
            }
            if (data.hardSkillsMatch) {
                html += `<dt class="col-sm-4">Hard Skills Match</dt><dd class="col-sm-8"><strong>Score:</strong> ${data.hardSkillsMatch.score}/10 <br> <em>${data.hardSkillsMatch.justification || ''}</em></dd>`;
            }
            if (data.softSkillsMatch) {
                html += `<dt class="col-sm-4">Soft Skills Match</dt><dd class="col-sm-8"><strong>Score:</strong> ${data.softSkillsMatch.score}/10 <br> <em>${data.softSkillsMatch.justification || ''}</em></dd>`;
            }
            html += `<dt class="col-sm-4">Overall Score</dt><dd class="col-sm-8"><span class="display-5 fw-bold text-warning bg-warning-subtle px-3 rounded">${data.overallScore !== undefined ? data.overallScore : 'N/A'}</span>/40</dd>`;
            html += `<dt class="col-sm-4">Summary</dt><dd class="col-sm-8">${data.summary || '<em>No summary provided.</em>'}</dd>`;
            html += '</dl>';
        } else {
            html += '<p>No evaluation data to display.</p>';
        }
        return html;
    }

    function renderKeywordDetails(keywordDetailsHtmlString, title) {
        let html = `<h3>${title}</h3>`;
        if (keywordDetailsHtmlString) {
            html += keywordDetailsHtmlString; 
        } else {
            html += '<p>No keyword matching details to display.</p>';
        }
        return html;
    }

    const GEMINI_API_EMBEDDING_URL = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";
    const GEMINI_API_GENERATIVE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    async function callGeminiAPI(prompt, type = "generate") {
        if (!geminiApiKey) {
            alert("Gemini API Key is not set. Please save your API key.");
            if (apiKeyModalInstance) {
                apiKeyModalInstance.show();
            } else {
                apiKeyDialogEl.showModal(); 
            }
            return null;
        }
        showLoader(); 
        const API_URL = type === "embed" ? GEMINI_API_EMBEDDING_URL : GEMINI_API_GENERATIVE_URL;
        const requestBody = type === "embed" ?
            { model: "models/text-embedding-004", content: { parts: [{ text: prompt }] } } :
            { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2 } }; 

        try {
            updateStatus(`Calling Gemini API (${type})...`);
            const response = await fetch(`${API_URL}?key=${geminiApiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Gemini API Error:", errorData);
                updateStatus(`Error calling Gemini API: ${errorData.error?.message || response.statusText}`);
                throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message}`);
            }
            updateStatus("Gemini API call successful.");
            hideLoader(); 
            return await response.json();
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            updateStatus(`Exception during Gemini API call: ${error.message}`);
            hideLoader(); 
            return null;
        }
    }

    createScoringFrameworkBtn.addEventListener('click', async () => {
        const jobDescription = jobDescriptionInput.value.trim();
        if (!jobDescription) {
            alert("Please enter a job description.");
            return;
        }
        showLoader();
        try {
            updateStatus("Starting job description processing...");
            jobDescriptionOutput.innerHTML = '<p>Processing job description...</p>';

            const extractionPrompt = `
                Extract the following information from the job description provided below.
                Present the output as a JSON object with keys: "hardSkills", "softSkills", "experienceRequirements", "educationRequirements", "keywords".
                Each key should have an array of strings as its value.
                - hardSkills: Specific, teachable abilities (e.g., "Python", "JavaScript", "Project Management").
                - softSkills: Interpersonal skills (e.g., "Communication", "Teamwork", "Problem-solving").
                - experienceRequirements: Explicit and implicit experience needed (e.g., "5+ years in software development", "Experience leading a team").
                - educationRequirements: Explicit and implicit education needed (e.g., "Bachelor's degree in Computer Science", "Master's preferred").
                - keywords: Other important terms or phrases relevant to the job. Limit the keywords array to a maximum of 10 items, prioritizing the most important and relevant terms.

                Job Description:
                ---
                ${jobDescription}
                ---
            `;
            updateStatus("Extracting information from job description...");
            const extractionResult = await callGeminiAPI(extractionPrompt);

            if (!extractionResult || !extractionResult.candidates || !extractionResult.candidates[0].content.parts[0].text) {
                jobDescriptionOutput.innerHTML = '<p class="text-danger fw-bold">Failed to extract information from job description.</p>';
                updateStatus("Failed to extract information from job description.");
                return;
            }

            let extractedData;
            try {
                const rawJson = extractionResult.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
                extractedData = JSON.parse(rawJson);
                JobPostExtractedInfoSchema.parse(extractedData); 
                updateStatus("Job description information extracted and validated.");
                jobDescriptionOutput.innerHTML = renderKeyValuePairs(extractedData, "Extracted Job Information");
            } catch (e) {
                let zodErrorHtml = '';
                if (e instanceof z.ZodError) {
                    zodErrorHtml = '<ul>' + e.errors.map(err => `<li><strong>${err.path.join('.')}</strong>: ${err.message}</li>`).join('') + '</ul>';
                }
                jobDescriptionOutput.innerHTML = `<p class="text-danger fw-bold">Error processing extracted job data: ${e.message}</p>${zodErrorHtml}<details><summary>Raw output</summary><pre>${extractionResult.candidates[0].content.parts[0].text}</pre></details>`;
                updateStatus("Error processing extracted job data.");
                return;
            }

            const categorizationPrompt = `
                Based on the extracted information from the job description, categorize the requirements into "mustHave" and "niceToHave".
                Present the output as a JSON object with keys: "mustHave" and "niceToHave".
                Each of these keys should contain an object with the following structure: "hardSkills", "softSkills", "experienceRequirements", "educationRequirements", "keywords".
                Analyze the language used in the job description (e.g., "must have", "required", "essential" vs. "preferred", "plus", "bonus") to determine the category.

                Extracted Information:
                ---
                ${JSON.stringify(extractedData, null, 2)}
                ---

                Job Description (for context):
                ---
                ${jobDescription}
                ---
            `;
            updateStatus("Categorizing requirements from job description...");
            const categorizationResult = await callGeminiAPI(categorizationPrompt);

            if (!categorizationResult || !categorizationResult.candidates || !categorizationResult.candidates[0].content.parts[0].text) {
                jobDescriptionOutput.innerHTML += '<p class="text-danger fw-bold">Failed to categorize requirements.</p>';
                updateStatus("Failed to categorize requirements.");
                return;
            }

            let categorizedData;
            try {
                const rawJson = categorizationResult.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
                categorizedData = JSON.parse(rawJson);
                JobPostCategorizedInfoSchema.parse(categorizedData); 
                updateStatus("Job description requirements categorized and validated.");
                jobDescriptionOutput.innerHTML += renderCategorizedInfo(categorizedData, "Categorized Requirements");
                sessionStorage.setItem('jobFramework', JSON.stringify(categorizedData));
                evaluateResumeBtn.disabled = false; 
            } catch (e) {
                console.error("Error parsing or validating categorized job data:", e);
                jobDescriptionOutput.innerHTML += `<p class="text-danger fw-bold">Error processing categorized job data: ${e.message}. Raw output: <pre>${categorizationResult.candidates[0].content.parts[0].text}</pre></p>`;
                updateStatus("Error processing categorized job data.");
            }
            updateStatus("Job description processing complete.");
        } finally {
            hideLoader();
        }
    });

    evaluateResumeBtn.addEventListener('click', async () => {
        const jobFrameworkString = sessionStorage.getItem('jobFramework'); 
        if (!jobFrameworkString) {
            alert("Please create the scoring framework from the job description first.");
            return;
        }
        const jobFramework = JSON.parse(jobFrameworkString);

        const resumeFile = resumeFileInput.files[0];
        if (!resumeFile) {
            alert("Please upload a resume PDF.");
            return;
        }
        if (resumeFile.type !== "application/pdf") {
            alert("Please upload a PDF file for the resume.");
            return;
        }

        showLoader();
        try {
            updateStatus("Starting resume evaluation...");
            resumeOutput.innerHTML = '<p>Processing resume...</p>';

            let resumeText;
            try {
                updateStatus("Extracting text from PDF...");
                const fileReader = new FileReader();
                const arrayBuffer = await new Promise((resolve, reject) => {
                    fileReader.onload = (event) => resolve(event.target.result);
                    fileReader.onerror = (error) => reject(error);
                    fileReader.readAsArrayBuffer(resumeFile);
                });

                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                }
                resumeText = fullText.trim();
                updateStatus("Text extracted from PDF.");
                resumeOutput.innerHTML = `<h3>Extracted Resume Text:</h3><div style="white-space: pre-wrap; word-break: break-word; overflow-x: auto; max-height: 300px;">${resumeText.substring(0,50000)}...</div><p>&nbsp;</p>`;
            } catch (error) {
                console.error("Error processing PDF:", error);
                resumeOutput.innerHTML = `<p class="text-danger fw-bold">Error processing PDF: ${error.message}</p>`;
                updateStatus(`Error processing PDF: ${error.message}`);
                return;
            }

            const resumeExtractionPrompt = `
                Extract the following information from the resume text provided below.
                Present the output as a JSON object with keys: "hardSkills", "softSkills", "totalYearsExperience", "education", "keywords", and "fullText".
                - hardSkills: Array of strings (e.g., "Python", "SQL"). If no explicit hard skills are listed, INFER them from job titles, responsibilities, and project descriptions in the resume text. Do not leave this array empty if any technical or domain-specific skills can be reasonably deduced.
                - softSkills: Array of strings (e.g., "Leadership", "Communication").
                - totalYearsExperience: A number representing the total years of professional experience. Calculate this by summing up durations from roles. If specific dates are not available, make a reasonable estimate based on the text.
                - education: An array of objects, each with "degree", "major", "university", and "graduationDate" (string).
                - keywords: Other important terms or phrases from the resume. Limit the keywords array to a maximum of 10 items, prioritizing the most important and relevant terms.
                - fullText: The complete text extracted from the resume.

                Resume Text:
                ---
                ${resumeText}
                ---
            `;
            updateStatus("Extracting information from resume text...");
            const resumeExtractionResult = await callGeminiAPI(resumeExtractionPrompt);

            if (!resumeExtractionResult || !resumeExtractionResult.candidates || !resumeExtractionResult.candidates[0].content.parts[0].text) {
                resumeOutput.innerHTML += '<p class="text-danger fw-bold">Failed to extract information from resume.</p>';
                updateStatus("Failed to extract information from resume.");
                return;
            }

            let resumeData;
            try {
                const rawJson = resumeExtractionResult.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
                resumeData = JSON.parse(rawJson);
                resumeData.fullText = resumeText;
                ResumeExtractedInfoSchema.parse(resumeData); 
                updateStatus("Resume information extracted and validated.");
                resumeOutput.innerHTML += renderResumeExtractedInfo(resumeData, "Extracted Resume Information");
            } catch (e) {
                let zodErrorHtml = '';
                if (e instanceof z.ZodError) {
                    zodErrorHtml = '<ul>' + e.errors.map(err => `<li><strong>${err.path.join('.')}</strong>: ${err.message}</li>`).join('') + '</ul>';
                }
                resumeOutput.innerHTML += `<p class="text-danger fw-bold">Error processing extracted resume data: ${e.message}</p>${zodErrorHtml}<details><summary>Raw output</summary><pre>${resumeExtractionResult.candidates[0].content.parts[0].text}</pre></details>`;
                updateStatus("Error processing extracted resume data.");
                return;
            }

            let keywordMatchingScore = 0;
            let keywordDetails = ''; 
            try {
                updateStatus("Performing keyword matching (cosine similarity)...");
                const jobKeywords = [...new Set([...jobFramework.mustHave.keywords, ...jobFramework.niceToHave.keywords])];
                const resumeKeywords = resumeData.keywords;

                async function getEmbeddingsForKeywords(keywords) {
                    const embeddings = [];
                    for (const kw of keywords) {
                        const embedResult = await callGeminiAPI(kw, "embed");
                        if (embedResult && embedResult.embedding && embedResult.embedding.values) {
                            embeddings.push(embedResult.embedding.values);
                        } else if (embedResult && embedResult.embeddings && embedResult.embeddings[0] && embedResult.embeddings[0].values) {
                            embeddings.push(embedResult.embeddings[0].values);
                        } else {
                            embeddings.push(null); 
                        }
                    }
                    return embeddings;
                }

                function cosineSimilarity(vecA, vecB) {
                    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
                    let dot = 0, normA = 0, normB = 0;
                    for (let i = 0; i < vecA.length; i++) {
                        dot += vecA[i] * vecB[i];
                        normA += vecA[i] * vecA[i];
                        normB += vecB[i] * vecB[i];
                    }
                    return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
                }

                const jobEmbeddings = await getEmbeddingsForKeywords(jobKeywords);
                const resumeEmbeddings = await getEmbeddingsForKeywords(resumeKeywords);

                let totalSim = 0;
                let matchedKeywords = [];
                let validMatches = 0;
                for (let i = 0; i < jobEmbeddings.length; i++) {
                    const jobVec = jobEmbeddings[i];
                    if (!jobVec) continue;
                    let maxSim = 0;
                    let bestMatch = null;
                    for (let j = 0; j < resumeEmbeddings.length; j++) {
                        const resumeVec = resumeEmbeddings[j];
                        if (!resumeVec) continue;
                        const sim = cosineSimilarity(jobVec, resumeVec);
                        if (sim > maxSim) {
                            maxSim = sim;
                            bestMatch = resumeKeywords[j];
                        }
                    }
                    if (maxSim >= 0.5) {
                        totalSim += maxSim;
                        validMatches++;
                        if (bestMatch) {
                            matchedKeywords.push(`${jobKeywords[i]} ↔ ${bestMatch} (${maxSim.toFixed(2)})`);
                        }
                    }
                }
                const avgSim = validMatches ? totalSim / validMatches : 0;
                keywordMatchingScore = Math.round(avgSim * 10);

                keywordDetails = '<dl class="row">'; 
                keywordDetails += `<dt class="col-sm-4">Job Keywords</dt><dd class="col-sm-8">${jobKeywords.join(', ') || 'N/A'}</dd>`;
                keywordDetails += `<dt class="col-sm-4">Resume Keywords</dt><dd class="col-sm-8">${resumeKeywords.join(', ') || 'N/A'}</dd>`;
                
                if (matchedKeywords.length > 0) {
                    keywordDetails += `<dt class="col-sm-4">Best Matches</dt><dd class="col-sm-8"><ul class="list-unstyled mb-0">`;
                    matchedKeywords.forEach(match => {
                        keywordDetails += `<li>${match}</li>`;
                    });
                    keywordDetails += `</ul></dd>`;
                } else {
                    keywordDetails += `<dt class="col-sm-4">Best Matches</dt><dd class="col-sm-8">No matches found.</dd>`;
                }
                
                keywordDetails += `<dt class="col-sm-4">Average Cosine Similarity</dt><dd class="col-sm-8">${(avgSim * 100).toFixed(2)}%</dd>`;
                keywordDetails += `<dt class="col-sm-4">Keyword Match Score</dt><dd class="col-sm-8"><span class="display-5 fw-bold text-warning bg-warning-subtle px-3 rounded">${keywordMatchingScore}</span>/10</dd>`;
                keywordDetails += `</dl>`;

                updateStatus("Keyword matching (cosine similarity) complete.");
            } catch (e) {
                keywordDetails = `<p class="text-danger fw-bold">Error during keyword matching: ${e.message}</p>`; 
                updateStatus(`Error during keyword matching: ${e.message}`);
            }

            const scoringPrompt = `
                You are an expert HR professional evaluating a candidate's resume against a job description.
                The job description requirements have been categorized into "mustHave" and "niceToHave".
                The candidate's resume information has been extracted.

                Job Framework:
                ---
                ${JSON.stringify(jobFramework, null, 2)}
                ---

                Candidate's Resume Information:
                ---
                ${JSON.stringify(resumeData, null, 2)}
                ---

                Your task is to provide a detailed evaluation and a scoring for the following categories. All individual scores should be between 0 and 10.
                1.  **Experience Matching**:
                    *   Compare the candidate's total years of experience against the job's experienceRequirements.
                    *   Provide a score (0-10) and a brief justification. For example, if the required years of experience is 10, a candidate with 2 years would get a score of 2, a candidate with 7 years gets a 7, and a candidate with 14 years (or more) would get a 10. If no specific years are mentioned in requirements, assess based on the complexity and relevance of roles.
                2.  **Education Matching**:
                    *   Compare the candidate's education (degree, major) against the job's educationRequirements. Do not weigh the institution.
                    *   Provide a score (0-10) and a brief justification.
                3.  **Skills Matching (Hard & Soft)**:
                    *   Compare the candidate's hard and soft skills against those listed in the job framework (both mustHave and niceToHave).
                    *   Provide a score (0-10) for hard skills and a score (0-10) for soft skills, with brief justifications.

                Output the evaluation as a JSON object with the following structure:
                {
                  "experienceMatch": { "score": <number 0-10>, "justification": "<string>" },
                  "educationMatch": { "score": <number 0-10>, "justification": "<string>" },
                  "hardSkillsMatch": { "score": <number 0-10>, "justification": "<string>" },
                  "softSkillsMatch": { "score": <number 0-10>, "justification": "<string>" },
                  "overallScore": <number 0-40>, // Sum of the four scores above, or a weighted assessment.
                  "summary": "<string>" // A brief overall summary of the candidate's fit
                }

                Consider "mustHave" requirements with higher importance when determining justifications and summary, but the scores should reflect the direct comparison as instructed.
                Be objective and base your evaluation strictly on the provided information.
            `;

            updateStatus("Performing detailed matching and scoring with Gemini...");
            const scoringResult = await callGeminiAPI(scoringPrompt);

            if (!scoringResult || !scoringResult.candidates || !scoringResult.candidates[0].content.parts[0].text) {
                resumeOutput.innerHTML += '<p class="text-danger fw-bold">Failed to get scoring from Gemini.</p>';
                updateStatus("Failed to get scoring from Gemini.");
                return;
            }

            let evaluationData;
            try {
                const rawJson = scoringResult.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
                evaluationData = JSON.parse(rawJson);

                if (!evaluationData.experienceMatch || !evaluationData.educationMatch || !evaluationData.hardSkillsMatch || !evaluationData.softSkillsMatch || typeof evaluationData.overallScore !== 'number') {
                    throw new Error("Scoring data is missing required fields.");
                }
                updateStatus("Detailed matching and scoring complete.");
                resumeOutput.innerHTML += renderEvaluationScores(evaluationData, "Evaluation & Scoring");
                resumeOutput.innerHTML += renderKeywordDetails(keywordDetails, "Keyword Matching Details");
            } catch (e) {
                console.error("Error parsing or validating scoring data:", e);
                resumeOutput.innerHTML += `<p class="text-danger fw-bold">Error processing scoring data: ${e.message}. Raw output: <pre>${scoringResult.candidates[0].content.parts[0].text}</pre></p>`;
                updateStatus("Error processing scoring data.");
            }
            updateStatus("Resume evaluation complete.");
        } finally {
            hideLoader();
        }
    });

    updateStatus("Ready. Please enter API Key if prompted.");
    if (geminiApiKey) {
        updateStatus("API Key loaded from session storage.");
    }

    console.log("Event listeners and initial setup complete.");
});
