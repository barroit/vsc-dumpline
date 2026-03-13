/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025, 2026 Jiamu Sun <barroit@linux.com>
 */
dnl
include(lib/panel/node.m4)dnl
include(lib/option.m4)dnl

import {
	seq_wait as __seq_wait,
	seq_wake as __seq_wake,
} from '../lib/seq.js'

import btn from '../lib/panel/btn.js'
import {
	chunk_init,
	chunk_parse,
	chunk_balence_fast,
	chunk_balence_slow,
} from '../lib/panel/chunk.js'
import { html_resolve_str, html_parse_str } from '../lib/panel/html.js'
import { warn, info } from '../lib/panel/mesg.js'
import {
	render_init,
	render_window_once,
	render_window,
} from '../lib/panel/render.js'
import { style_init_root, style_resolve } from '../lib/panel/style.js'
import {
	tree_canonicalize,
	tree_trim_tail,
	tree_trim_head,
	tree_calc_indent_head,
	tree_calc_indent_body,
	tree_setup_lineno,
	tree_pad_head,
} from '../lib/panel/tree.js'
import { dump_init, dump_free, dump_dispatch } from '../lib/panel/dump.js'
import { utf16_init } from '../lib/panel/utf16.js'

let __config
const result = {}

export const webview = acquireVsCodeApi()
const cleanup = []

const seq_map = new Map()
const dump_map = new Map()

const seq_wait = __seq_wait.bind(undefined, seq_map)
const seq_wake = __seq_wake.bind(undefined, seq_map)

export const canvas = document.getElementById('canvas')
export const root = document.documentElement

function cleanup_listeners()
{
	let desc

	while (desc = cleanup.pop())
		window.removeEventListener(...desc)
}

function disable_btns()
{
	btn['copy_file'].disabled = true
	btn['open_dir'].disabled = true
	btn['open_file'].disabled = true
}

function enable_btns()
{
	btn['copy_file'].disabled = false
	btn['open_dir'].disabled = false
	btn['open_file'].disabled = false
}

function setup_tree(tree, config, wgts, delta)
{
	tree_canonicalize(tree)

	let tail_drop
	let head_drop

	if (config['trim'] & TRIM_TAIL)
		tail_drop = tree_trim_tail(tree)

	if (tail_drop) {
		config.row_end -= tail_drop
		config.col_end = 0
		wgts.splice(-tail_drop)
	}

	if (config['trim'] & TRIM_HEAD && tree.hasChildNodes())
		head_drop = tree_trim_head(tree, config, wgts)

	if (head_drop) {
		config.row_begin -= head_drop
		config.col_begin = 0
		wgts.splice(0, head_drop)
		delta.wd_base -= head_drop
	}

	if (!tree.hasChildNodes())
		return

	if (!config['no-lineno'])
		tree_setup_lineno(tree, config)

	let head_indent = tree_calc_indent_head(tree)
	let indent = tree_calc_indent_body(tree)

	if (!config['no-pad'])
		head_indent += tree_pad_head(tree, config)

	if (config['no-indent'])
		indent = 0
	else if (indent > head_indent)
		indent = head_indent

	delta.indent = indent
}

function setup_canvas(ctx, ck, line_h)
{
	const lines = ctx.row_end - ctx.row_begin + 1
	const canvas_h = line_h * lines
	const canvas_w = ck.width.baseVal.value

	canvas.style.width = `${canvas_w}px`
	canvas.style.height = `${canvas_h}px`
}

function on_scroll(last_y, on_frame)
{
	if (window.scrollY == last_y[0])
		return

	last_y[0] = window.scrollY
	window.requestAnimationFrame(on_frame)
}

function enable_rendering(ctx, cks)
{
	const last_y = [ 0 ]
	const render_window_fn = render_window.bind(undefined, ctx, cks)

	const on_scroll_fn = on_scroll.bind(undefined, last_y, render_window_fn)
	const on_scroll_desc = [ 'scroll' , on_scroll_fn ]

	cleanup.push(on_scroll_desc)
	window.addEventListener(...on_scroll_desc, { passive: true })
}

function iso_now()
{
	const raw_date = new Date()
	const iso_date = raw_date.toISOString()
	const name = iso_date.replace(/[:.]/g, '-')

	return name
}

async function on_paste(event)
{
	const config = __config

	if (!config.ready)
		return
	config.ready = 0

	disable_btns()
	cleanup_listeners()

	if (CHILD_OF(canvas))
		CHILD_OF(canvas).remove()

	utf16_init(config)

	config.style = getComputedStyle(canvas)

	if (!root.dataset.ready) {
		style_init_root(root, config.style, config)
		root.dataset.ready = ''
	}

	const clipboard = event.clipboardData
	const [ html, ln_wgts, wbase ] = html_resolve_str(clipboard, config)

	const tree = html_parse_str(html)
	const delta = { wbase, indent: 0 }

	setup_tree(tree, config, ln_wgts, delta)

	if (!tree.hasChildNodes()) {
		warn(webview, 'nothing to be done')
		return
	}

	const ck_size = config.tune.max_chunk_size
	let max_wk = config.tune.max_worker

	const ck_node = chunk_init(ck_size, tree, delta.wbase, delta.indent)
	const cks = chunk_parse(ck_node, tree, ck_size)
	let tasks

	if (cks.length > max_wk) {
		tasks = chunk_balence_slow(cks, ln_wgts, ck_size, max_wk)

	} else {
		tasks = chunk_balence_fast(cks)
		max_wk = cks.length
	}

	const line_h_str = style_resolve(config.style, '--39-line-height')
	const line_h = parseInt(line_h_str)

	setup_canvas(config, ck_node, line_h)
	canvas.dataset.current = config.id

	const render_ctx = render_init(ck_size, cks.length, line_h, cleanup)
	const dump_ctx = dump_init(config.id, max_wk)

	const time = iso_now()
	const prefix = `${config.rt_dir}/${time}`

	enable_rendering(render_ctx, cks)
	render_window_once(render_ctx, cks)

	webview.postMessage([ 'showst', config.id, time ])
	await seq_wait(config.id)

	webview.postMessage([ 'mkdir', config.id, prefix ])
	await seq_wait(config.id)

	dump_dispatch(dump_ctx, tasks, prefix, cks.length, max_wk)
	await seq_wait(config.id)

	const [ png_w, png_most_h, png_last_h ] = dump_map.get(config.id)

	dump_map.delete(config.id)
	dump_free(config.id)

	webview.postMessage([ 'record', config.id, prefix,
			      cks.length, png_w, png_most_h, png_last_h ])
	await seq_wait(config.id)

	webview.postMessage([ 'merge', config.id, prefix ])
	await seq_wait(config.id)

	webview.postMessage([ 'dropst', config.id ])

	result.id = config.id
	result.dir = prefix
	result.name = `${prefix}/dump.png`

	enable_btns()
}

function on_render(config)
{
	result.id = 0x3939
	delete result.cache

	__config = config
	__config.ready = 1

	document.execCommand('paste')
}

async function on_dump_done(id, ck, prefix, ck_idx, ck_cnt, w, h)
{
	let prev = dump_map.get(id)

	if (!prev)
		prev = [ w, h, h, 0 ]

	if (ck_idx != ck_cnt - 1)
		prev[1] = h
	else
		prev[2] = h

	prev[3]++
	dump_map.set(id, prev)

	webview.postMessage([ 'nextst', id, ck_idx, prev[3], ck_cnt ])

	if (prev[3] == ck_cnt)
		seq_wake(id)
}

async function write_clipboard(blob)
{
	const data = { [ blob.type ]: blob }
	const item = new ClipboardItem(data)

	await navigator.clipboard.write([ item ])
	info(webview, 'image copied to clipboard')
}

function on_read_done(name, out)
{
	const blob = new Blob([ out.buf ], { type: 'image/png' })

	write_clipboard(blob)
	result.cache = blob
}

function recv_mesg({ data: [ name, ...data ] })
{
	const fn_map = {
		'render': on_render,

		'dump_done': on_dump_done,
		'record_done': seq_wake,
		'merge_done': seq_wake,

		'read_done': on_read_done,
		'mkdir_done': seq_wake,

		'showst_done': seq_wake,
	}
	const fn = fn_map[name]

	if (fn)
		fn(...data)
}

function on_btn_click(fn)
{
	if (!canvas.dataset.current || canvas.dataset.current != result.id) {
		warn(webview, 'image not ready')
		return
	}

	fn()
}

function copy_file()
{
	if (!result.cache)
		webview.postMessage([ 'read', result.name, {} ])
	else
		write_clipboard(result.cache)
}

function open_dir()
{
	webview.postMessage([ 'open', result.dir ])
}

function open_file()
{
	webview.postMessage([ 'open', result.name ])
}

const on_copy_file = on_btn_click.bind(undefined, copy_file)
const on_open_dir = on_btn_click.bind(undefined, open_dir)
const on_open_file = on_btn_click.bind(undefined, open_file)

btn['copy_file'].disabled = true
btn['open_dir'].disabled = true
btn['open_file'].disabled = true

btn['copy_file'].addEventListener('click', on_copy_file)
btn['open_dir'].addEventListener('click', on_open_dir)
btn['open_file'].addEventListener('click', on_open_file)

document.addEventListener('paste', on_paste)
window.addEventListener('message', recv_mesg)

webview.postMessage([ 'ready', 39 ])
