/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

export function error(webview, mesg)
{
	webview.postMessage([ 'error', mesg ])
}

export function warn(webview, mesg)
{
	webview.postMessage([ 'warn', mesg ])
}

export function info(webview, mesg)
{
	webview.postMessage([ 'info', mesg ])
}
