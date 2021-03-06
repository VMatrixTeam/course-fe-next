import { Tree, names, formatFiles, installPackagesTask, updateJson, getWorkspaceLayout } from '@nrwl/devkit';
import { libraryGenerator } from '@nrwl/angular/src/schematics/library/library';
import { join } from 'path';

const TYPE_PREFIX_MAP = {
  'data-access': 'data',
  feature: 'feat',
  ui: 'ui',
  util: 'util'
};

export default async function (tree: Tree, schema: any) {
  const prefixToCheck = TYPE_PREFIX_MAP[schema.type];
  if (!schema.name.startsWith(prefixToCheck)) {
    throw new Error(`类型为 '${schema.type}' 的库的名称必须以 '${prefixToCheck}' 开头`);
  }

  console.log('');
  console.log('走你 ┏ (゜ω゜)=☞');

  await libraryGenerator(tree, {
    name: schema.name,
    directory: schema.directory,
    tags: `load:${schema.load},scope:${schema.scope},type:${schema.type}${schema.tags ? `,${schema.tags}` : ''}`,
    simpleModuleName: true,
    style: 'css',
    strict: true,
    unitTestRunner: 'none',
    linter: 'eslint',
    prefix: 'app'
  });

  const name = names(schema.name).fileName;
  const projectDirectory = schema.directory ? `${names(schema.directory).fileName}/${name}` : name;
  const projectRoot = `${getWorkspaceLayout(tree).libsDir}/${projectDirectory}`;

  // fix a linting error
  const moduleFile = join(projectRoot, 'src', 'lib', `${name}.module.ts`);
  const content = tree.read(moduleFile).toString();
  tree.write(
    moduleFile,
    content.replace(
      `import { NgModule } from '@angular/core';\nimport { CommonModule } from '@angular/common';`,
      `import { CommonModule } from '@angular/common';\nimport { NgModule } from '@angular/core';`
    )
  );

  await updateJson(tree, join(projectRoot, '.eslintrc.json'), (json) => {
    // remove unnecessary extend rules because they're already specified in root .eslintrc.json
    json.overrides[0].extends = [];
    // fix a typescript-eslint bug that a wrong relative path is given by default
    json.overrides[0].parserOptions.project[0] = 'tsconfig.*?.json';
    // remove the unnecessary 'rules' block because we enforce using 'app' as prefix globally,
    // which is already specified in the 'rules' block of root .eslintrc.json
    json.overrides[0].rules = {};
    // remove the unnecessary rule block for *.html because it's already specified in root .eslintrc.json
    json.overrides.pop();
    return json;
  });

  await updateJson(tree, join(projectRoot, 'tsconfig.lib.json'), (json) => {
    // enforce es2018 as the compile target ;)
    json.compilerOptions.target = 'es2018';
    return json;
  });

  await formatFiles(tree);

  return () => {
    installPackagesTask(tree);
  };
}
