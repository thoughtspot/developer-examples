import { NodePlopAPI } from 'plop';
import readdir from 'readdir-enhanced';
import * as fs from 'fs';

export default function (plop: NodePlopAPI) {
    const transformName = (str) => {
        return str.toLowerCase().replace(/ /g, '-');
    };

    function filterFn(stats) {
        if (stats.isDirectory() || stats.path.match(/(^node_modules)/)) {
            return false;
        }
        return true;
    }

    plop.setGenerator('example', {
        description: 'new example in repo',
        prompts: [
            {
                type: 'input',
                name: 'name',
                message: 'Example name: ',
            },
            {
                type: 'list',
                name: 'exampleScopeFolder',
                message: 'Scope (Example folder): ',
                choices: [
                    { name: 'Visual Embed', value: 'visual-embed' },
                    { name: 'Rest APIs', value: 'rest-api' },
                    { name: 'Solutions', value: 'solutions' },
                    { name: 'Starter', value: 'starter' },
                    { name: 'Mobile', value: 'mobile' },
                ],
            },
            {
                type: 'list',
                name: 'language',
                message: 'Language / Framework: ',
                choices: [
                    { name: 'React + TS', value: 'react-ts' },
                    { name: 'Typescript (Web)', value: 'ts' },
                    { name: 'Typescript (Node)', value: 'node' },
                    { name: 'Python', value: 'python' },
                    { name: 'React Native + TS', value: 'react-native-ts' },
                    { name: 'Other', value: 'other' },
                ],
            },
        ],
        actions: (data) => {
            if (!data) {
                return [];
            }

            const plopExampleName = transformName(data.name);
            const plopPath = `${data.exampleScopeFolder}/${plopExampleName}`;
            const templateDir = `utilities/plop-templates/${data.language}`;

            const actions: any[] = [];

            readdir.sync(templateDir, { deep: true, filter: filterFn }).forEach((file) => {
                actions.push({
                    type: 'add',
                    path: `${data.exampleScopeFolder}/${plopExampleName}/${file}`,
                    templateFile: `${templateDir}/${file}`,
                    force: true,
                });
                actions.push({
                    type: 'modify',
                    path: `${data.exampleScopeFolder}/${plopExampleName}/${file}`,
                    pattern: /(-- PLOP EXAMPLE NAME HERE --)/gi,
                    template: `${plopExampleName}`,
                });
                actions.push({
                    type: 'modify',
                    path: `${data.exampleScopeFolder}/${plopExampleName}/${file}`,
                    pattern: /(-- PLOP PATH HERE --)/gi,
                    template: `${plopPath}`,
                });
            });

            if (data.language === 'react-native-ts') {
                const fullProjectPath = `${process.cwd()}/${data.exampleScopeFolder}/${plopExampleName}`;

                // Run post-generation script
                actions.push(function runPostGeneration(answers) {
                    const postGen = require('child_process');
                    postGen.execSync(`node utilities/plop-templates/react-native-ts/post-generation.js ${fullProjectPath}`, { stdio: 'inherit' });
                    return 'React Native post-generation complete.';
                });
            } else {
                actions.push({
                    type: 'modify',
                    path: `${data.exampleScopeFolder}/${plopExampleName}/app/layout.tsx`,
                    pattern: /(-- PLOP PATH HERE --)/gi,
                    template: `${plopPath}`,
                });
                actions.push({
                    type: 'modify',
                    path: `${data.exampleScopeFolder}/${plopExampleName}/app/layout.tsx`,
                    pattern: /(-- PLOP TITLE HERE --)/gi,
                    template: `${data.name}`,
                });

                actions.push({
                    type: 'modify',
                    path: `${data.exampleScopeFolder}/${plopExampleName}/README.md`,
                    pattern: /(-- PLOP TITLE HERE --)/gi,
                    template: `${data.name}`,
                });
                actions.push({
                    type: 'modify',
                    path: `${data.exampleScopeFolder}/${plopExampleName}/README.md`,
                    pattern: /(-- PLOP EXAMPLE NAME HERE --)/gi,
                    template: `${plopExampleName}`,
                });
                actions.push({
                    type: 'modify',
                    path: `${data.exampleScopeFolder}/${plopExampleName}/README.md`,
                    pattern: /(-- PLOP PATH HERE --)/gi,
                    template: `${plopPath}`,
                });

                actions.push({
                    type: 'modify',
                    path: `${data.exampleScopeFolder}/${plopExampleName}/app/page.tsx`,
                    pattern: /(-- PLOP TITLE HERE --)/gi,
                    template: `${data.name}`,
                });
            }

            actions.push({
                type: 'modify',
                path: `${data.exampleScopeFolder}/${plopExampleName}/package.json`,
                pattern: /(-- PLOP EXAMPLE NAME HERE --)/gi,
                template: `${plopExampleName}`,
            });

            return actions;
        },
    });
}