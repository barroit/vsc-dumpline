/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */
dnl
include(lib/panel/node.m4)dnl

import { calc_tabspan, calc_str_width } from './calc.js'
import { style_resolve } from './style.js'
import { trace_start, trace_stop } from './trace.js'

function gen_box_style(style)
{
	const out = []
	const map = [
		[ 'color',            '--vscode-editor-foreground'  ],
		[ 'background-color', '--vscode-editor-background'  ],
		[ 'font-family',      '--vscode-editor-font-family' ],
		[ 'font-weight',      '--vscode-editor-font-weight' ],
		[ 'font-size',        '--vscode-editor-font-size'   ],
		[ 'line-height',      '--39-line-height'            ],
		[ 'white-space',      '--39-whitespace'             ],
	]

	for (const [ name, key ] of map) {
		const val = style_resolve(style, key)
		const line = `${name}: ${val}`

		out.push(line)
	}

	return out.join(';')
}

function expand_tabs(str)
{
	const cols = str.split('\t')
	const out = []
	let idx

	for (idx = 0; idx < cols.length - 1; idx++) {
		const col = cols[idx]
		const col_len = calc_str_width(col)

		const tab_len = calc_tabspan(col_len)
		const pad = ' '.repeat(tab_len)

		out.push(col, pad)
	}

	out.push(cols[idx])
	return out.join('')
}

function loop_plain_lines(plain, fn_list, fn_args)
{
	const ln_list = plain.split('\n')
	let ln_idx

	for (ln_idx = 0; ln_idx < ln_list.length; ln_idx++) {
		let fn_idx

		for (fn_idx = 0; fn_idx < fn_list.length; fn_idx++) {
			const fn = fn_list[fn_idx]
			const args = fn_args[fn_idx]

			if (ln_list[ln_idx] != '')
				ln_list[ln_idx] = expand_tabs(ln_list[ln_idx])

			fn(ln_list[ln_idx], ...args, ln_idx, ln_list)
		}
	}
}

function find_width_base(line, wd_base, line_idx, line_list)
{
	if (line.length > line_list[wd_base[0]].length)
		wd_base[0] = line_idx
}

function build_weight_list(str, weights)
{
	const weight = calc_str_width(str)

	weights.push(weight)
}

function build_fake_block(line, lines, sanitizer, blk_begin, blk_end)
{
	let built

	if (line == '') {
		built = '<br>'

	} else {
		TEXT_OF(sanitizer) = line
		built = blk_begin + sanitizer.innerHTML + blk_end
	}

	lines.push(built)
}

function fake_resolve_str(plain, weights, wd_base, ctx)
{
	const box_style = gen_box_style(ctx.style)
	const lines = []

	const sanitizer = document.createElement('div')
	const foreground = style_resolve(ctx.style,
					 '--vscode-editor-foreground')

	const blk_begin = `<div><span style="color: ${foreground}">`
	const blk_end = '</span></div>'

	const fn_list = [
		find_width_base,
		build_weight_list,
		build_fake_block,
	]
	const fn_args = [
		[ wd_base ],
		[ weights ],
		[ lines, sanitizer, blk_begin, blk_end ],
	]

	lines.push(`<div style="${box_style}">`)
	loop_plain_lines(plain, fn_list, fn_args)
	lines.push('</div>')

	const html = lines.join('')

	return html
}

export function html_resolve_str(clipboard, ctx)
{
	trace_start('html_resolve_str')

	let html = clipboard.getData('text/html')
	const plain = clipboard.getData('text/plain')

	const weights = []
	const wd_base = [ 0 ]

	if (!html) {
		html = fake_resolve_str(plain, weights, wd_base, ctx)

	} else {
		const fn_list = [
			find_width_base,
			build_weight_list,
		]
		const fn_args = [
			[ wd_base ],
			[ weights ],
		]

		loop_plain_lines(plain, fn_list, fn_args)
	}

	trace_stop('html_resolve_str')
	return [ html, weights, wd_base[0] ]
}

export function html_parse_str(text)
{
	trace_start('html_parse_str')

	const canvas = document.createElement('template')

	canvas.innerHTML = text

	const box = CHILD_OF(canvas.content)

	trace_stop('html_parse_str')
	return box
}
