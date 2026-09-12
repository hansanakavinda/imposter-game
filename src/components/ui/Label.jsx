import React from 'react'
import { cx } from './tokens'

/** The small uppercase caption above a group of controls. */
export default function Label({ as: Tag = 'span', className = '', children, ...rest }) {
  return (
    <Tag className={cx('block text-micro font-bold uppercase text-ink-faint', className)} {...rest}>
      {children}
    </Tag>
  )
}
