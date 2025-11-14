import { NodePlopAPI } from 'plop';
import readdir from 'readdir-enhanced';

export default function (plop: NodePlopAPI) {
    const transformName = (str) => {
        return str.toLowerCase().replace(/ /g, '-')
    }

    function filterFn(stats) {
        if (stats.isDirectory() || stats.path.match(/(^node_modules)/)) {
            return false;
        }
        return true;
    }

    // create your generators here
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
                    { name: 'Other', value: 'other' },
                ]
            },
        ],
        actions: (data) => {
            if (!data) {
                return [];
            }

            const plopExampleName = transformName(data.name)
            const plopPath = `${data.exampleScopeFolder}/${plopExampleName}`
            const templateDir = `utilities/plop-templates/${data.language}`

            const actions: any[] = [];

            readdir.sync(templateDir, { deep: true, filter: filterFn }).forEach((file) => {
                actions.push({
                    type: 'add',
                    path: `{{exampleScopeFolder}}/${plopExampleName}/${file}`,
                    templateFile: `${templateDir}/${file}`,
                })
                actions.push({
                    type: 'modify',
                    path: `{{exampleScopeFolder}}/${plopExampleName}/${file}`,
                    pattern: /(-- PLOP EXAMPLE NAME HERE --)/gi,
                    template: `${plopExampleName}`,
                });
                actions.push({
                    type: 'modify',
                    path: `{{exampleScopeFolder}}/${plopExampleName}/${file}`,
                    pattern: /(-- PLOP PATH HERE --)/gi,
                    template: `${plopPath}`,
                });
            });

            return actions;
            // modify app/layout.tsx
            actions.push({
                type: 'modify',
                path: `{{exampleScopeFolder}}/${plopExampleName}/app/layout.tsx`,
                pattern: /(-- PLOP PATH HERE --)/gi,
                template: `${plopPath}`,
            })
            actions.push({
                type: 'modify',
                path: `{{exampleScopeFolder}}/${plopExampleName}/app/layout.tsx`,
                pattern: /(-- PLOP TITLE HERE --)/gi,
                template: `${data.name}`,
            })

            return [
                ...actions,
                // README.md
                {
                    type: 'modify',
                    path: `{{exampleScopeFolder}}/${plopExampleName}/README.md`,
                    pattern: /(-- PLOP TITLE HERE --)/gi,
                    template: `${data.name}`,
                },
                {
                    type: 'modify',
                    path: `{{exampleScopeFolder}}/${plopExampleName}/README.md`,
                    pattern: /(-- PLOP EXAMPLE NAME HERE --)/gi,
                    template: `${plopExampleName}`,
                },
                {
                    type: 'modify',
                    path: `{{exampleScopeFolder}}/${plopExampleName}/README.md`,
                    pattern: /(-- PLOP PATH HERE --)/gi,
                    template: `${plopPath}`,
                },
                // package.json
                {
                    type: 'modify',
                    path: `{{exampleScopeFolder}}/${plopExampleName}/package.json`,
                    pattern: /(-- PLOP EXAMPLE NAME HERE --)/gi,
                    template: `${plopExampleName}`,
                },
                {
                    type: 'modify',
                    path: `{{exampleScopeFolder}}/${plopExampleName}/app/page.tsx`,
                    pattern: /(-- PLOP TITLE HERE --)/gi,
                    template: `${data.name}`,
                },
            ]
        },
    })
}