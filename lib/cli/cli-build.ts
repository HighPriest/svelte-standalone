import { checkbox } from '@inquirer/prompts';

import { glob } from 'glob';
import { buildStandalone } from './methods/index.js';
import path from 'path';

const rootDir = process.cwd().replaceAll(path.sep, path.posix.sep);

const c = glob
	.sync(`${rootDir}/src/_standalone/**/embed.{js,ts}`) // Matches both .js and .ts
	.map((file) => {
		const normalizedPath = path.normalize(file);
		const match = normalizedPath.match(/src[\\/]_standalone[\\/](.*?)[\\/]embed\.(js|ts)/);
		return match ? { name: match[1], value: file, checked: true } : null;
	})
	.filter(Boolean) as {
	name: string;
	value: string;
	checked: boolean;
}[];

export const buildStrategy = {
	name: 'components',
	message: 'Which components should be builded?',
	choices: c
} as const;

export async function build({
	production: prod,
	all,
	injectAssets,
	stripRuntime,
	mode,
	source: inputDir,
	target: outputDir
}: {
	production: boolean;
	all: boolean;
	injectAssets: boolean;
	stripRuntime: boolean;
	mode: string;
	source: string;
	target: string;
}) {
	if (buildStrategy.choices.length === 0) {
		console.warn(
			"You don't have any standalone component. Create them running: standalone create."
		);

		return;
	}

	const hasRuntime = stripRuntime
		? false
		: c.some(({ name }) => /(\$runtime|\+runtime|runtime)/.test(name ?? ''));

	if (all) {
		buildStandalone({
			componentsPaths: c.map((co) => co.value),
			prod,
			injectAssets,
			hasRuntime,
			mode,
			inputDir,
			outputDir
		});

		return;
	}

	const componentsPaths: string[] = await checkbox(buildStrategy);

	try {
		buildStandalone({ componentsPaths, prod, injectAssets, hasRuntime, mode, inputDir, outputDir });
	} catch (error) {
		if (error instanceof Error && error.name === 'ExitPromptError') {
			// noop; silence this error
		} else {
			throw error;
		}
	}
}
