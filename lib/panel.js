/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import crypto from 'node:crypto'
import { pathToFileURL as path_to_url } from 'node:url'

import { vsc_webview_init, vsc_view_column, vsc_uri } from '../lib/vsc.js'

export function panel_init(ext)
{
	const view_opt = {
		viewColumn: vsc_view_column.Beside,
		preserveFocus: true,
		localResourceRoots: [ ext.binary.extensionUri ],
	}
	const panel_opt = {
		enableScripts: true,
		retainContextWhenHidden: true,
	}
	const panel = vsc_webview_init(NAME, '39dump', view_opt, panel_opt)

	return panel
}

export function panel_gen_html(webview, prefix_in)
{
	const prefix = vsc_uri.joinPath(prefix_in, 'build', 'panel')

	const stylesheet_uri = vsc_uri.joinPath(prefix, 'index.css')
	const stylesheet = webview.asWebviewUri(stylesheet_uri)

	const script_uri = vsc_uri.joinPath(prefix, 'index.js')
	const script = webview.asWebviewUri(script_uri)

	const worker_uri = vsc_uri.joinPath(prefix, 'worker.js')
	const worker = webview.asWebviewUri(worker_uri)

	const utf16_class_uri = vsc_uri.joinPath(prefix, 'utf16_class')
	const utf16_class = webview.asWebviewUri(utf16_class_uri)

	const utf16_class_su_uri = vsc_uri.joinPath(prefix, 'utf16_class_su')
	const utf16_class_su = webview.asWebviewUri(utf16_class_su_uri)

	const rand = crypto.randomBytes(16)
	const nonce = rand.toString('base64')

	return `
include(build/panel/index.html)dnl
	`
}
