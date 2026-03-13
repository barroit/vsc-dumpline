/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */
dnl
include(lib/option.m4)dnl

import crypto from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import { platform } from 'node:process'
import { pathToFileURL } from 'node:url'

import {
	seq_wait as __seq_wait,
	seq_wake as __seq_wake,
} from '../lib/seq.js'
import { error, warn, info } from '../lib/mesg.js'
import {
	vsc_env,
	vsc_exec_cmd,
	vsc_window,
	vsc_status_pos,
	vsc_uri,
} from '../lib/vsc.js'

import { opt_ensure_valid } from '../lib/option.js'
import { panel_init, panel_gen_html } from '../lib/panel.js'
import {
	png_save_chunk,
	png_save_size,
	png_merge_chunk,
} from '../lib/png.js'

import { rt_dir, bar_map } from '../entry.js'

const cp_rich_cmd = 'editor.action.clipboardCopyWithSyntaxHighlightingAction'

let panel
let ext

const seq_map = new Map()
const seq_wait = __seq_wait.bind(undefined, seq_map)
const seq_wake = __seq_wake.bind(undefined, seq_map)

const trim_flags = {
	'trailing': TRIM_TAIL,
	'leading': TRIM_HEAD,
	'both': TRIM_TAIL | TRIM_HEAD,
}

function fixup_config(config, editor, editor_config)
{
	const select = editor.selection
	const doc = editor.document

	const head_line = doc.lineAt(select.start.line)

	const rand = crypto.randomBytes(16)
	const nonce = rand.toString('base64')

	config.id = nonce
	config.rt_dir = rt_dir

	config.row_begin = select.start.line
	config.col_begin = select.start.character

	config.row_end = select.end.line
	config.col_end = select.end.character

	config.head_line = head_line.text

	config.line_height = editor_config.lineHeight
	config.line_height_ratio = platform == 'darwin' ? 1.5 : 1.35

	config.tabstop = editor.options.tabSize
	config.lang = vsc_env.language

	config.trim = trim_flags[config.trim]
}

function on_mkdir(id, prefix)
{
	mkdirSync(prefix)
}

function on_open(name)
{
	const url = vsc_uri.file(name)

	vsc_env.openExternal(url)
}

function on_read(name, out)
{
	const bytes = readFileSync(name)
	const view = new Uint8Array(bytes.buffer,
				    bytes.byteOffset, bytes.byteLength)

	out.buf = view
}

async function run_bar(id, bar, token)
{
	// token.onCancellationRequested(() => seq_wake(id))
	bar.report({ message: 'initializing' })

	bar_map.set(id, bar)
	await seq_wait(id)

	// if (token.isCancellationRequested)
	// 	panel.postMessage([ 'stop', id ])
}

function on_showst(id, time)
{
	const opt = {
		location: vsc_status_pos.Notification,
		title: time,
		// cancellable: true,
	}
	const run_bar_fn = run_bar.bind(undefined, id)

	vsc_window.withProgress(opt, run_bar_fn)
}

function on_nextst(id, ck_idx, cur, ck_cnt)
{
	const bar = bar_map.get(id)
	const message = `working on chunk ${ck_idx} (${cur}/${ck_cnt})`

	bar.report({ message })
}

function on_dropst(id)
{
	seq_wake(id)
	bar_map.delete(id)
}

async function recv_event([ name, ...data ])
{
	const fn_map = {
		'ready': seq_wake,

		'dump':   png_save_chunk,
		'record': png_save_size,
		'merge':  png_merge_chunk,

		'error': error,
		'warn':  warn,
		'info':  info,

		'read':  on_read,
		'open':  on_open,
		'mkdir': on_mkdir,

		'showst': on_showst,
		'nextst': on_nextst,
		'dropst': on_dropst,
	}
	const fn = fn_map[name]

	await fn(...data)
	panel.webview.postMessage([ `${name}_done`, ...data ])
}

function init_panel(ext)
{
	panel = panel_init(ext)

	const webview = panel.webview
	const prefix = ext.binary.uri

	panel.onDidDispose(nuke_panel, undefined, ext.cleanup)
	panel.iconPath = vsc_uri.joinPath(prefix, 'image', 'barroit',
					  'negi.svg')

	webview.html = panel_gen_html(webview, prefix)
	webview.onDidReceiveMessage(recv_event, undefined, ext.cleanup)
}

function nuke_panel()
{
	panel = undefined
}

export async function exec(editor)
{
	const ext = this
	const config = ext.fetch_config('dumpline')
	const editor_config = ext.fetch_config('editor')

	opt_ensure_valid(config)
	fixup_config(config, editor, editor_config)

	if (panel) {
		panel.reveal(panel.viewColumn, true)

	} else {
		init_panel(ext)
		await seq_wait(39)
	}

	await vsc_exec_cmd(cp_rich_cmd)
	panel.webview.postMessage([ 'render', config ])
}
