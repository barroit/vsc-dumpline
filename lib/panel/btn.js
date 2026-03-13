/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

const btns = [ 'copy_file', 'open_dir', 'open_file' ]
const btn = {}

export default btn

function btn_mark_ctxmenu()
{
	this.dataset.rmb = ''
}

function btn_unmark_ctxmenu()
{
	delete this.dataset.rmb
}

for (const name of btns) {
	btn[name] = document.getElementById(`${name}_btn`)

	btn[name].addEventListener('contextmenu', btn_mark_ctxmenu)
	btn[name].addEventListener('mouseup', btn_unmark_ctxmenu)
}
