import { type PortfolioProject } from './portfolioConstellation';
import { preloadImage } from '../../utils/assetLoaders';
import { portfolioSkills } from './portfolioSkills';
import {
    PROJECT_DETAILS_IMAGE_SIZES,
    PROJECT_PREVIEW_IMAGE_SIZES,
    projectImagesById,
} from './projectImageAssets';

const withProjectScreenshots = (projects: PortfolioProject[]): PortfolioProject[] =>
    projects.map((project) => ({
        ...project,
        screenshot: projectImagesById[project.id]?.preview,
        detailsScreenshot: projectImagesById[project.id]?.details,
        skills: project.skills.map(
            (skill) =>
                portfolioSkills[portfolioSkills.findIndex((s) => s.id === skill)]?.label ?? skill,
        ),
    }));

const getAdjacentProjects = (
    project: PortfolioProject,
    projects: PortfolioProject[],
): PortfolioProject[] => {
    const index = projects.findIndex((candidate) => candidate.id === project.id);
    if (index < 0 || projects.length < 2) {
        return [];
    }

    return [
        projects[(index - 1 + projects.length) % projects.length],
        projects[(index + 1) % projects.length],
    ];
};

export const preloadAdjacentProjectScreenshots = (project: PortfolioProject): void => {
    const constellationProjects = portfolioProjects.filter(
        (candidate) => candidate.constellation.id === project.constellation.id,
    );
    const adjacentProjects = new Set([
        ...getAdjacentProjects(project, portfolioProjects),
        ...getAdjacentProjects(project, constellationProjects),
    ]);

    adjacentProjects.forEach((candidate) => {
        if (candidate.screenshot) {
            preloadImage(candidate.screenshot, PROJECT_PREVIEW_IMAGE_SIZES);
        }
    });
};

export const preloadAdjacentProjectDetails = async (project: PortfolioProject): Promise<void> => {
    const adjacentScreenshots = getAdjacentProjects(project, portfolioProjects).flatMap(
        (candidate) => (candidate.detailsScreenshot ? [candidate.detailsScreenshot] : []),
    );

    await Promise.allSettled(
        adjacentScreenshots.map((source) => preloadImage(source, PROJECT_DETAILS_IMAGE_SIZES)),
    );
};

// NOTE: Exact build dates for these projects weren't in your resume, so
// "period" below is a placeholder ("Personal project"). Replace with real
// date ranges if you have them — the resume only gave dates for your
// internships and hackathons, not each individual project.

const aiMlProjects: PortfolioProject[] = [
    {
        id: 'lung-cancer-prediction',
        title: 'Lung Cancer Prediction Model',
        label: 'Lung Cancer Model',

        description:
            'A deep-learning model trained on medical imaging data to support early-stage lung cancer detection. Used a convolutional neural network with transfer learning to classify scans, focused on catching cases earlier than manual review alone.',

        period: 'Personal project',
        role: 'Independent Developer',

        skills: ['python', 'cnn', 'deep-learning', 'transfer-learning', 'machine-learning'],

        domain: 'Healthcare / Medical Imaging',
        owner: 'Independent Personal Project',

        constellation: {
            id: 'ai-ml',
            position: [0.05, 1.1, -0.2],
            links: ['mental-health-chatbot', 'legal-mitra-ai'],
        },
    },
];

const llmProjects: PortfolioProject[] = [
    {
        id: 'mental-health-chatbot',
        title: 'Mental Health Chatbot',
        label: 'Mental Health Bot',

        description:
            'An LLM-based conversational assistant focused on supportive, empathetic interactions. Built to give people a low-friction first point of contact for talking through what they’re feeling, with careful attention to tone and response framing.',

        period: 'Personal project',
        role: 'Independent Developer',

        skills: ['llm', 'nlp', 'python', 'conversational-ai'],

        domain: 'AI / Mental Health Support',
        owner: 'Independent Personal Project',

        constellation: {
            id: 'llm-apps',
            position: [-0.4, 0.2, 0.05],
            links: ['legal-mitra-ai', 'jarvis-voice-assistant'],
        },
    },
    {
        id: 'legal-mitra-ai',
        title: 'Legal Mitra AI',
        label: 'Legal Mitra AI',

        description:
            'An LLM-powered assistant designed to simplify legal queries and improve information access for non-expert users, translating dense legal language into plain, understandable answers.',

        period: 'Personal project',
        role: 'Independent Developer',

        skills: ['llm', 'nlp', 'python'],

        domain: 'AI / Legal Tech',
        owner: 'Independent Personal Project',

        constellation: {
            id: 'llm-apps',
            position: [0.5, -0.35, -0.08],
            links: ['mental-health-chatbot'],
        },
    },
    {
        id: 'jarvis-voice-assistant',
        title: 'Jarvis — AI Voice Assistant',
        label: 'Jarvis',

        description:
            'A voice-controlled assistant for schedules, reminders, and smart-home commands, built with natural-language interaction so requests can be spoken conversationally rather than typed as fixed commands.',

        period: 'Personal project',
        role: 'Independent Developer',

        skills: ['javascript', 'nlp', 'machine-learning'],

        domain: 'AI / Voice Interfaces',
        owner: 'Independent Personal Project',

        constellation: {
            id: 'llm-apps',
            position: [-0.15, -0.85, 0.02],
            links: ['mental-health-chatbot'],
        },
    },
];

const webToolsProjects: PortfolioProject[] = [
    {
        id: 'medisure',
        title: 'MediSure — Counterfeit Medicine Detection Platform',
        label: 'MediSure',

        description:
            'A web platform for medicine authentication and counterfeit-product detection, built to help buyers verify medicines before use. Open-sourced on GitHub for others to build on.',

        period: 'Personal project',
        role: 'Independent Developer',

        skills: ['javascript', 'html', 'css', 'web-security'],

        domain: 'Healthcare / Product Authentication',
        owner: 'Independent Personal Project',

        constellation: {
            id: 'web-tools',
            position: [-1.0, 0.75, -0.15],
            links: ['phishing-link-detector'],
        },
    },
    {
        id: 'phishing-link-detector',
        title: 'Phishing Link Detector',
        label: 'Phishing Detector',

        description:
            'A real-time browser extension that scans URLs as you browse and flags potential phishing links before you click through, aimed at everyday users rather than security specialists.',

        period: 'Personal project',
        role: 'Independent Developer',

        skills: ['javascript', 'chrome-extension', 'web-security'],

        domain: 'Cybersecurity / Browser Tooling',
        owner: 'Independent Personal Project',

        constellation: {
            id: 'web-tools',
            position: [-0.35, 0.05, 0.1],
            links: ['medisure', 'block-chop'],
        },
    },
    {
        id: 'block-chop',
        title: 'Block Chop',
        label: 'Block Chop',

        description:
            'A responsive, browser-based Fruit-Ninja-style slicing game built with vanilla HTML, CSS, and JavaScript — a smaller project focused on smooth animation and input handling without a game framework.',

        period: 'Personal project',
        role: 'Independent Developer',

        skills: ['javascript', 'html', 'css', 'game-development'],

        domain: 'Game Development / Web',
        owner: 'Independent Personal Project',

        constellation: {
            id: 'web-tools',
            position: [-0.75, -0.85, -0.05],
            links: ['phishing-link-detector'],
        },
    },
];

const constellationScrollOrder = {
    'ai-ml': 0,
    'llm-apps': 1,
    'web-tools': 2,
} satisfies Record<PortfolioProject['constellation']['id'], number>;

const compareProjectScrollOrder = (a: PortfolioProject, b: PortfolioProject): number =>
    constellationScrollOrder[a.constellation.id] - constellationScrollOrder[b.constellation.id] ||
    a.constellation.position[0] - b.constellation.position[0] ||
    b.constellation.position[1] - a.constellation.position[1];

const portfolioProjectsWithoutScreenshots: PortfolioProject[] = [
    ...aiMlProjects,
    ...llmProjects,
    ...webToolsProjects,
].sort(compareProjectScrollOrder);

export const portfolioProjects: PortfolioProject[] = withProjectScreenshots(
    portfolioProjectsWithoutScreenshots,
);