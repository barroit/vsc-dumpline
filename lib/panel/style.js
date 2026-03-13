/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

export function style_resolve(style, name)
{
	return style.getPropertyValue(name)
}

/*
 * Found in vscode repo, src/vs/editor/common/config/fontInfo.ts:_create().
 */
function calc_line_height(base, min, ratio, scale)
{
	if (base == 0)
		base = ratio * scale
	else if (base < min)
		base *= scale

	base = Math.round(base)
	return base < min ? min : base
}

function init_line_height(root, style, ctx)
{
	const scale_str = style_resolve(style, '--vscode-editor-font-size')
	const scale = parseInt(scale_str)

	const ratio = ctx.line_height_ratio
	let base = ctx.line_height

	if (!Number.isInteger(base))
		base = 0

	const height = calc_line_height(base, 8, ratio, scale)

	root.style.setProperty('--39-line-height', `${height}px`)
}

function init_lineno_color(root, style)
{
	const fg = style_resolve(style, '--vscode-editorLineNumber-foreground')

	root.style.setProperty('--39-lineno-color', fg)
}

function init_whitespace(root)
{
	root.style.setProperty('--39-whitespace', 'pre')
}

const init_tasks = [
	init_line_height,
	init_lineno_color,
	init_whitespace,
]

export function style_init_root(root, style, ctx)
{
	for (const task of init_tasks)
		task(root, style, ctx)
}
