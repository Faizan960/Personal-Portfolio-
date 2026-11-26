-- =============================================================================
-- Migration: 007_seed_portfolio.sql
-- Description: Complete idempotent baseline seed from src/data/portfolio.ts.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. portfolio_settings (Singleton)
-- -----------------------------------------------------------------------------
INSERT INTO public.portfolio_settings (
    id, personal, statement_alternatives, meta, hero, about, contact, social, recognition, nav_sections
) VALUES (
    1,
    '{
        "name": "Faizan Patel",
        "wordmark": "FAIZAN",
        "initials": "FP",
        "role": "Computer Engineering Student",
        "descriptor": "Exploring AI, Web Development, Cloud Computing & DevOps.",
        "statement": "Building with code, AI and curiosity.",
        "location": "Mumbai, India",
        "resumeHref": null
    }'::jsonb,
    '[
        "Building with code, AI & curiosity.",
        "Exploring technology. Building practical solutions.",
        "Computer Engineering × AI × Web × Cloud.",
        "Learning, building, and experimenting with technology."
    ]'::jsonb,
    '{
        "title": "Faizan Patel — Computer Engineering Student",
        "description": "Personal portfolio of Faizan Patel, a Computer Engineering student exploring artificial intelligence, web development, cloud computing and DevOps.",
        "siteUrl": null
    }'::jsonb,
    '{
        "kicker": "Portfolio",
        "primaryCta": { "label": "Explore My Work", "targetId": "work" },
        "secondaryCta": { "label": "Let''s Connect", "targetId": "contact" }
    }'::jsonb,
    '{
        "kicker": "About",
        "heading": "About Me",
        "paragraphs": [
            "I''m a Computer Engineering student interested in building practical software solutions and exploring emerging technologies. My interests span software development, artificial intelligence, modern web technologies, cloud computing and DevOps."
        ],
        "metadata": [
            { "label": "Focus", "value": "Computer Engineering" },
            { "label": "Currently", "value": "Web Developer Intern" },
            { "label": "Based in", "value": "Mumbai, India" },
            { "label": "Interests", "value": "AI · Web · Cloud · DevOps" }
        ]
    }'::jsonb,
    '{
        "kicker": "Contact",
        "heading": "Let''s Build Something",
        "statement": "Have an idea, project, or opportunity? Let''s connect.",
        "links": [
            { "id": "email", "label": "Email", "handle": "faizanpatel2226@gmail.com", "href": "mailto:faizanpatel2226@gmail.com" },
            { "id": "linkedin", "label": "LinkedIn", "handle": "linkedin.com/in/faizan-patel2", "href": "https://www.linkedin.com/in/faizan-patel2/" },
            { "id": "github", "label": "GitHub", "handle": "github.com/Faizan960", "href": "https://github.com/Faizan960" }
        ]
    }'::jsonb,
    '[
        { "id": "email", "label": "Email", "handle": "faizanpatel2226@gmail.com", "href": "mailto:faizanpatel2226@gmail.com" },
        { "id": "linkedin", "label": "LinkedIn", "handle": "linkedin.com/in/faizan-patel2", "href": "https://www.linkedin.com/in/faizan-patel2/" },
        { "id": "github", "label": "GitHub", "handle": "github.com/Faizan960", "href": "https://github.com/Faizan960" }
    ]'::jsonb,
    '{
        "kicker": "Recognition",
        "heading": "Recognition",
        "achievementsLabel": "Achievement",
        "certificationsLabel": "Certifications"
    }'::jsonb,
    '[
        { "id": "about", "label": "About", "index": "01" },
        { "id": "skills", "label": "Skills", "index": "02" },
        { "id": "work", "label": "Work", "index": "03" },
        { "id": "experience", "label": "Experience", "index": "04" },
        { "id": "contact", "label": "Contact", "index": "08" }
    ]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    personal = EXCLUDED.personal,
    statement_alternatives = EXCLUDED.statement_alternatives,
    meta = EXCLUDED.meta,
    hero = EXCLUDED.hero,
    about = EXCLUDED.about,
    contact = EXCLUDED.contact,
    social = EXCLUDED.social,
    recognition = EXCLUDED.recognition,
    nav_sections = EXCLUDED.nav_sections;

-- -----------------------------------------------------------------------------
-- 2. skill_categories
-- -----------------------------------------------------------------------------
INSERT INTO public.skill_categories (id, label, display_index, caption, sort_order, is_visible)
VALUES
    ('programming', 'Programming', '01', 'Core languages and fundamentals.', 1, true),
    ('web', 'Web Development', '02', 'Interfaces, application code and styling systems.', 2, true),
    ('ai', 'AI & Machine Learning', '03', 'Building with AI, and building software that uses it.', 3, true),
    ('cloud', 'Cloud & DevOps', '04', 'Infrastructure, containers and delivery.', 4, true),
    ('tools', 'Tools & Design', '05', 'Day-to-day development and design environment.', 5, true)
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    display_index = EXCLUDED.display_index,
    caption = EXCLUDED.caption,
    sort_order = EXCLUDED.sort_order,
    is_visible = EXCLUDED.is_visible;

-- -----------------------------------------------------------------------------
-- 3. skills
-- Stable IDs: category_id || ':' || normalized_name
-- -----------------------------------------------------------------------------
INSERT INTO public.skills (id, category_id, name, sort_order, is_visible)
VALUES
    -- Programming
    ('programming:c', 'programming', 'C', 1, true),
    ('programming:cpp', 'programming', 'C++', 2, true),
    ('programming:python', 'programming', 'Python', 3, true),
    ('programming:java', 'programming', 'Java', 4, true),
    ('programming:javascript', 'programming', 'JavaScript', 5, true),
    -- Web Development
    ('web:html', 'web', 'HTML', 1, true),
    ('web:css', 'web', 'CSS', 2, true),
    ('web:javascript', 'web', 'JavaScript', 3, true),
    ('web:react', 'web', 'React', 4, true),
    ('web:nextjs', 'web', 'Next.js', 5, true),
    ('web:typescript', 'web', 'TypeScript', 6, true),
    ('web:tailwind-css', 'web', 'Tailwind CSS', 7, true),
    -- AI & Machine Learning
    ('ai:artificial-intelligence', 'ai', 'Artificial Intelligence', 1, true),
    ('ai:ai-assisted-development', 'ai', 'AI-assisted development', 2, true),
    ('ai:ai-application-development', 'ai', 'AI application development', 3, true),
    ('ai:ai-apis', 'ai', 'AI APIs', 4, true),
    ('ai:ai-powered-software-systems', 'ai', 'AI-powered software systems', 5, true),
    -- Cloud & DevOps
    ('cloud:aws', 'cloud', 'AWS', 1, true),
    ('cloud:docker', 'cloud', 'Docker', 2, true),
    ('cloud:git', 'cloud', 'Git', 3, true),
    ('cloud:github', 'cloud', 'GitHub', 4, true),
    ('cloud:linux', 'cloud', 'Linux', 5, true),
    ('cloud:ci-cd-concepts', 'cloud', 'CI/CD concepts', 6, true),
    -- Tools & Design
    ('tools:git', 'tools', 'Git', 1, true),
    ('tools:github', 'tools', 'GitHub', 2, true),
    ('tools:vs-code', 'tools', 'VS Code', 3, true),
    ('tools:figma', 'tools', 'Figma', 4, true)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order,
    is_visible = EXCLUDED.is_visible;

-- -----------------------------------------------------------------------------
-- 4. technologies (Dictionary)
-- -----------------------------------------------------------------------------
INSERT INTO public.technologies (id, name, normalized_name)
VALUES
    ('c', 'C', 'c'),
    ('cpp', 'C++', 'cpp'),
    ('python', 'Python', 'python'),
    ('java', 'Java', 'java'),
    ('javascript', 'JavaScript', 'javascript'),
    ('kotlin', 'Kotlin', 'kotlin'),
    ('android', 'Android', 'android'),
    ('html', 'HTML', 'html'),
    ('css', 'CSS', 'css'),
    ('react', 'React', 'react'),
    ('nextjs', 'Next.js', 'nextjs'),
    ('typescript', 'TypeScript', 'typescript'),
    ('tailwind', 'Tailwind CSS', 'tailwind-css'),
    ('aws', 'AWS', 'aws'),
    ('docker', 'Docker', 'docker'),
    ('git', 'Git', 'git'),
    ('github', 'GitHub', 'github'),
    ('linux', 'Linux', 'linux'),
    ('figma', 'Figma', 'figma')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    normalized_name = EXCLUDED.normalized_name;

-- -----------------------------------------------------------------------------
-- 5. projects
-- -----------------------------------------------------------------------------
INSERT INTO public.projects (
    id, index, name, full_title, category, summary, featured, status, visibility, github, live_url, image, detail, sort_order
) VALUES
    (
        'gramcare',
        '01',
        'GramCare',
        'AI-Powered Offline Disease Outbreak Monitoring System',
        'AI / Healthcare Technology',
        'An AI-powered offline disease outbreak monitoring system currently under development, focused on supporting outbreak monitoring in low-connectivity environments.',
        true,
        'in-development',
        'development',
        null,
        null,
        null,
        '{
            "problem": "Disease outbreaks may be difficult to monitor in locations with limited connectivity.",
            "solution": "Use an AI-powered system capable of supporting disease-outbreak monitoring in offline or low-connectivity environments.",
            "features": [],
            "architecture": [],
            "contribution": null,
            "challenges": [],
            "lessons": [],
            "futureScope": [],
            "screenshots": [],
            "reservedSections": [
                { "label": "AI Component", "body": null },
                { "label": "Offline Architecture", "body": null },
                { "label": "Data Flow", "body": null },
                { "label": "Technology Stack", "body": null },
                { "label": "Key Features", "body": null },
                { "label": "Research Basis", "body": null },
                { "label": "Challenges", "body": null },
                { "label": "Future Scope", "body": null }
            ]
        }'::jsonb,
        1
    ),
    (
        'niyyah-app',
        '02',
        'Niyyah.app',
        null,
        'Mobile / Android',
        'A Kotlin-based application project focused on building a dedicated mobile experience.',
        false,
        'in-development',
        'public',
        'https://github.com/Faizan960/Niyyah.app',
        null,
        null,
        '{
            "problem": null,
            "solution": null,
            "features": [],
            "architecture": [],
            "contribution": null,
            "challenges": [],
            "lessons": [],
            "futureScope": [],
            "screenshots": [],
            "reservedSections": []
        }'::jsonb,
        2
    ),
    (
        'deepfake-detection',
        '03',
        'Deepfake Detection',
        null,
        'AI / Machine Learning',
        'A Python-based deepfake detection project exploring AI-driven media authenticity.',
        false,
        null,
        'public',
        'https://github.com/Faizan960/Deepfakedetection',
        null,
        null,
        '{
            "problem": null,
            "solution": null,
            "features": [],
            "architecture": [],
            "contribution": null,
            "challenges": [],
            "lessons": [],
            "futureScope": [],
            "screenshots": [],
            "reservedSections": []
        }'::jsonb,
        3
    ),
    (
        'collab-notes',
        '04',
        'Collab-Notes',
        null,
        'Web Development',
        'A JavaScript-based collaborative notes project.',
        false,
        null,
        'public',
        'https://github.com/Faizan960/Collab-Notes',
        null,
        null,
        '{
            "problem": null,
            "solution": null,
            "features": [],
            "architecture": [],
            "contribution": null,
            "challenges": [],
            "lessons": [],
            "futureScope": [],
            "screenshots": [],
            "reservedSections": []
        }'::jsonb,
        4
    )
ON CONFLICT (id) DO UPDATE SET
    index = EXCLUDED.index,
    name = EXCLUDED.name,
    full_title = EXCLUDED.full_title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    featured = EXCLUDED.featured,
    status = EXCLUDED.status,
    visibility = EXCLUDED.visibility,
    github = EXCLUDED.github,
    live_url = EXCLUDED.live_url,
    image = EXCLUDED.image,
    detail = EXCLUDED.detail,
    sort_order = EXCLUDED.sort_order;

-- -----------------------------------------------------------------------------
-- 6. project_technologies
-- -----------------------------------------------------------------------------
INSERT INTO public.project_technologies (project_id, technology_id, sort_order)
VALUES
    ('niyyah-app', 'kotlin', 1),
    ('deepfake-detection', 'python', 1),
    ('collab-notes', 'javascript', 1)
ON CONFLICT (project_id, technology_id) DO UPDATE SET
    sort_order = EXCLUDED.sort_order;

-- -----------------------------------------------------------------------------
-- 7. project_skills (Verified semantic relationships)
-- -----------------------------------------------------------------------------
INSERT INTO public.project_skills (project_id, skill_id, relationship_type, sort_order)
VALUES
    ('deepfake-detection', 'programming:python', 'uses', 1),
    ('deepfake-detection', 'ai:ai-powered-software-systems', 'demonstrates', 2),
    ('collab-notes', 'programming:javascript', 'uses', 1),
    ('collab-notes', 'web:javascript', 'uses', 2)
ON CONFLICT (project_id, skill_id) DO UPDATE SET
    relationship_type = EXCLUDED.relationship_type,
    sort_order = EXCLUDED.sort_order;

-- -----------------------------------------------------------------------------
-- 8. experience
-- -----------------------------------------------------------------------------
INSERT INTO public.experience (
    id, role, organisation, period, location, duration, current, summary, sort_order, is_visible
) VALUES
    (
        'static-inc-intern',
        'Intern',
        'Static Inc.',
        'January 2023 — April 2023',
        'Mumbai, India',
        '3 months',
        false,
        'Interned at Static Inc. with a focus on Python web and Android development, strengthening Python fundamentals through targeted coding exercises and contributing to Android debugging and software-development activities.',
        1,
        true
    ),
    (
        'inamigos-web-dev-intern',
        'Web Developer Intern',
        'InAmigos Foundation',
        'August 2026 — Present',
        'Remote',
        '2 weeks',
        true,
        'Web development internship focused on AI-assisted website development and practical web-development tasks.',
        2,
        true
    )
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    organisation = EXCLUDED.organisation,
    period = EXCLUDED.period,
    location = EXCLUDED.location,
    duration = EXCLUDED.duration,
    current = EXCLUDED.current,
    summary = EXCLUDED.summary,
    sort_order = EXCLUDED.sort_order,
    is_visible = EXCLUDED.is_visible;

-- -----------------------------------------------------------------------------
-- 9. experience_technologies
-- -----------------------------------------------------------------------------
INSERT INTO public.experience_technologies (experience_id, technology_id, sort_order)
VALUES
    ('static-inc-intern', 'python', 1),
    ('static-inc-intern', 'android', 2)
ON CONFLICT (experience_id, technology_id) DO UPDATE SET
    sort_order = EXCLUDED.sort_order;

-- -----------------------------------------------------------------------------
-- 10. education
-- -----------------------------------------------------------------------------
INSERT INTO public.education (
    id, qualification, award, institution, period, location, current, sort_order, is_visible
) VALUES
    (
        'thakur-polytechnic-diploma',
        'Computer Science',
        'Diploma',
        'Thakur College of Polytechnic',
        'Completed 01/2024',
        'Mumbai',
        false,
        1,
        true
    ),
    (
        'theem-be-computer-engineering',
        'Computer Engineering',
        'BE',
        'Theem College of Engineering',
        'Expected 08/2027',
        'Mumbai',
        true,
        2,
        true
    )
ON CONFLICT (id) DO UPDATE SET
    qualification = EXCLUDED.qualification,
    award = EXCLUDED.award,
    institution = EXCLUDED.institution,
    period = EXCLUDED.period,
    location = EXCLUDED.location,
    current = EXCLUDED.current,
    sort_order = EXCLUDED.sort_order,
    is_visible = EXCLUDED.is_visible;

-- -----------------------------------------------------------------------------
-- 11. exploring_items
-- -----------------------------------------------------------------------------
INSERT INTO public.exploring_items (id, index, label, caption, sort_order, is_visible)
VALUES
    ('ai', '01', 'Artificial Intelligence', 'Applied machine learning and AI-assisted tooling.', 1, true),
    ('web', '02', 'Web Development', 'Modern frameworks, interface systems and performance.', 2, true),
    ('cloud', '03', 'Cloud Computing', 'Cloud services, deployment models and architecture.', 3, true),
    ('devops', '04', 'DevOps', 'Automation, containers and delivery pipelines.', 4, true)
ON CONFLICT (id) DO UPDATE SET
    index = EXCLUDED.index,
    label = EXCLUDED.label,
    caption = EXCLUDED.caption,
    sort_order = EXCLUDED.sort_order,
    is_visible = EXCLUDED.is_visible;

-- -----------------------------------------------------------------------------
-- 12. achievements
-- -----------------------------------------------------------------------------
INSERT INTO public.achievements (id, name, result, context, date, sort_order, is_visible)
VALUES
    (
        'sih-internal-hackathon',
        'SIH Internal Hackathon Winner',
        '4th Place',
        'Smart India Hackathon — internal round',
        null,
        1,
        true
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    result = EXCLUDED.result,
    context = EXCLUDED.context,
    date = EXCLUDED.date,
    sort_order = EXCLUDED.sort_order,
    is_visible = EXCLUDED.is_visible;

-- -----------------------------------------------------------------------------
-- 13. certifications
-- -----------------------------------------------------------------------------
INSERT INTO public.certifications (id, name, issuer, issued, credential_id, credential_url, sort_order, is_visible)
VALUES
    (
        'neo4j-certified-professional',
        'Neo4j Certified Professional',
        null,
        null,
        null,
        null,
        1,
        true
    ),
    (
        'mern-stack',
        'MERN Stack Certification',
        'Harkirat Singh',
        null,
        null,
        null,
        2,
        true
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    issuer = EXCLUDED.issuer,
    issued = EXCLUDED.issued,
    credential_id = EXCLUDED.credential_id,
    credential_url = EXCLUDED.credential_url,
    sort_order = EXCLUDED.sort_order,
    is_visible = EXCLUDED.is_visible;

-- -----------------------------------------------------------------------------
-- 14. globe_settings (Singleton)
-- -----------------------------------------------------------------------------
INSERT INTO public.globe_settings (id, core_label, core_subtitle, visual_config, layout_config)
VALUES (
    1,
    'Faizan',
    'Computer Engineering',
    '{
        "particleCount": 162,
        "ambientSpeed": 0.052,
        "damping": 0.055,
        "bloom": true
    }'::jsonb,
    '{
        "cameraZ": 3.15,
        "focal": 2.5,
        "radius": 0.34
    }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    core_label = EXCLUDED.core_label,
    core_subtitle = EXCLUDED.core_subtitle,
    visual_config = EXCLUDED.visual_config,
    layout_config = EXCLUDED.layout_config;
