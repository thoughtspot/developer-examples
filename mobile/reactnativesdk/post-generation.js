const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

const fullProjectPath = process.argv[2];
const projectName = path.basename(fullProjectPath);
const tempDir = path.join(path.dirname(fullProjectPath), 'temp-' + projectName);

try {
    console.log("fullProjectPath: " + fullProjectPath);
    console.log("projectName: " + projectName);

    console.log('Creating project directory...');
    fs.mkdirSync(fullProjectPath, { recursive: true });

    console.log('Creating temporary directory...');
    fs.mkdirSync(tempDir, { recursive: true });

    console.log('Initializing React Native project in temporary directory...');
    execSync(`cd ${tempDir} && npx @react-native-community/cli init ${projectName}`, { stdio: 'inherit' });

    console.log('Copying files from temporary directory...');
    fs.copySync(path.join(tempDir, projectName), fullProjectPath, { overwrite: true });

    console.log('Removing temporary directory...');
    fs.removeSync(tempDir);

    console.log('Installing TypeScript dependencies...');
    execSync(`cd ${fullProjectPath} && npm install typescript @types/node @types/react @types/react-native --save-dev`, { stdio: 'inherit' });

    console.log('Creating tsconfig.json...');
    fs.copyFileSync(path.join(__dirname, 'tsconfig.json'), path.join(fullProjectPath, 'tsconfig.json'));

    console.log('Renaming index.js to index.tsx...');
    if (fs.existsSync(path.join(fullProjectPath, 'index.js'))) {
        fs.renameSync(path.join(fullProjectPath, 'index.js'), path.join(fullProjectPath, 'index.tsx'));
    }

    // Check if App.tsx exists before renaming App.js
    if (fs.existsSync(path.join(fullProjectPath, 'App.js'))) {
        console.log('Renaming App.js to App.tsx...');
        fs.renameSync(path.join(fullProjectPath, 'App.js'), path.join(fullProjectPath, 'App.tsx'));
    } else {
        console.log('App.js does not exist. Skipping rename.');
    }

    // Add App.tsx from template
    console.log('Adding App.tsx from template...');
    fs.copyFileSync(path.join(__dirname, 'App.tsx'), path.join(fullProjectPath, 'App.tsx'));

    // Install additional dependencies
    console.log('Installing additional dependencies...');
    execSync(`cd ${fullProjectPath} && npm install @react-navigation/native @react-navigation/native-stack react-native-safe-area-context react-native-screens`, { stdio: 'inherit' });

    console.log('Installing dependencies...');
    execSync(`cd ${fullProjectPath} && npm install`, { stdio: 'inherit' });

    console.log('Post-generation complete!');

    console.log(`cd ${fullProjectPath}`);
    console.log(`cd ios && pod install`);
    console.log(`npx react-native run-ios`);

} catch (error) {
    console.error('Error during post-generation:', error);
    process.exit(1);
}