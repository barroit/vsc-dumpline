/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */
dnl
include(lib/panel/node.m4)dnl

import { calc_digit_width, calc_str_width } from './calc.js'
import { trace_start, trace_stop } from './trace.js'
import { utf16_class, utf16_class_su, utf16_width } from './utf16.js'

const lf_div = document.createElement('div')
const lf_span = document.createElement('span')
const lf_br = document.createElement('br')
const lf_node = lf_div

lf_span.style.visibility = 'hidden'
TEXT_OF(lf_span) = '\u200b'

lf_div.appendChild(lf_span)
lf_div.appendChild(lf_br)
lf_div.dataset.empty = ''

const lineno_span = document.createElement('span')
const lineno_node = lineno_span

lineno_span.style.paddingRight = '2ch'
lineno_span.style.color = 'var(--39-lineno-color)'

export function tree_canonicalize(tree)
{
	trace_start('html_canonicalize')

	let next = CHILD_OF(tree)

	do {
		if (next.tagName != 'BR' && CHILD_OF(next))
			continue

		const lf = lf_node.cloneNode(true)

		tree.replaceChild(lf, next)
		next = lf

	} while (next = NEXT_CHILD_OF(next))

	trace_stop('html_canonicalize')
}

export function tree_trim_tail(tree)
{
	let drop = 0
	let next = LAST_CHILD_OF(tree)

	do {
		if (next.dataset.empty == undefined)
			break

		tree.removeChild(next)
		drop++

	} while (next = LAST_CHILD_OF(tree))

	return drop
}

export function tree_trim_head(tree)
{
	let drop = 0
	let next = CHILD_OF(tree)

	do {
		if (next.dataset.empty == undefined)
			break

		tree.removeChild(next)
		drop++
	} while (next = CHILD_OF(tree))

	return drop
}

function count_indent_width(box)
{
	const token = CHILD_OF(box)
	const str = TEXT_OF(token)
	let cnt = 0

	while (str[cnt] == ' ')
		cnt++

	return cnt
}

export function tree_calc_indent_head(tree)
{
	const head = CHILD_OF(tree)

	if (head.dataset.empty)
		return 0

	return count_indent_width(head)
}

export function tree_calc_indent_body(tree)
{
	trace_start('html_setup_indent')

	let next = CHILD_OF(tree)
	let indent = -1 >>> 0

	while (next = NEXT_CHILD_OF(next)) {
		if (next.dataset.empty)
			continue

		const width = count_indent_width(next)

		if (indent > width)
			indent = width
	}

	if (indent == -1 >>> 0)
		indent = 0

	trace_stop('html_setup_indent')
	return
}

function init_pad_map(max)
{
	const empty = Array(max + 1)
	const initial = empty.fill(' ')

	const filled = initial.map((s, i) => s.repeat(i))
	const reversed = filled.reverse()

	return reversed
}

export function tree_setup_lineno(tree, ctx)
{
	trace_start('setup_lineno')

	const start = ctx.row_begin + 1
	const end = ctx.row_end + 1

	let next = CHILD_OF(tree)
	let line = start

	const width = calc_digit_width(end)
	const pad = init_pad_map(width)

	do {
		const idx = calc_digit_width(line)
		const lineno = lineno_node.cloneNode()

		TEXT_OF(lineno) = pad[idx] + line
		next.prepend(lineno)
		line++
	} while (next = NEXT_CHILD_OF(next))

	trace_stop('setup_lineno')
}

export function tree_pad_head(tree, ctx)
{
	const str = ctx.head_line.slice(0, ctx.col_begin)
	const width = calc_str_width(str)

	if (!width)
		return 0

	const pad = ' '.repeat(width)
	const token = CHILD_OF(CHILD_OF(tree))

	TEXT_OF(token) = pad + TEXT_OF(token)
	return width
}
