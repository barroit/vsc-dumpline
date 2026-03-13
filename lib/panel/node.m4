dnl SPDX-License-Identifier: GPL-3.0-or-later
dnl
divert(-1)

define(PARENT_OF, $1.parentElement)
define(CHILD_OF,  $1.firstChild)

define(LAST_CHILD_OF, $1.lastChild)
define(NEXT_CHILD_OF, $1.nextSibling)

define(TEXT_OF, $1.textContent)
define(CHILD_TEXT_OF, TEXT_OF(CHILD_OF($1)))

define(CHUNK_DATA_OF, CHILD_OF(CHILD_OF($1)))

divert(0)dnl
