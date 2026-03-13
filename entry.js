/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

import {
	vsc_fetch_config,
	vsc_map_ctx,
	vsc_add_editor_cmd,
} from './lib/vsc.js'

const cmds = {
	'multiple': [ import('./cmd/multiple.js'), vsc_add_editor_cmd ],
	'single':   [ import('./cmd/single.js'),   vsc_add_editor_cmd ],
}

const tmp_dir = tmpdir()
export const rt_dir = mkdtempSync(`${tmp_dir}/dumpline-`)
export const bar_map = new Map()

export async function activate(ctx)
{
	for (const id of Object.keys(cmds)) {
		const [ module_promise, cb ] = cmds[id]
		const module = await module_promise

		const cmd_ctx = vsc_map_ctx(ctx)
		const exec = cb(`dumpline.${id}`, module.exec, cmd_ctx)

		cmd_ctx.fetch_config = vsc_fetch_config
		ctx.subscriptions.push(exec)
	}
}
