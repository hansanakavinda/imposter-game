import React from 'react'
import { LIFT, RADIUS, cx } from './tokens'

/**
 * An object resting on the table.
 *
 * Every raised thing in the app is one of these, at one of four lift levels.
 * The lift tokens each carry a warm inset highlight on the top edge, which is
 * what makes the single overhead light source read as physical.
 */
export default function Surface({
  as: Tag = 'div',
  level = 1,
  radius = 'slab',
  inset = false,
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      className={cx(
        inset ? 'bg-well shadow-sink' : cx('bg-felt', LIFT[level]),
        'border border-edge',
        RADIUS[radius],
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
