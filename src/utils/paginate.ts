import type { Block } from '../templates/Classic';

export interface MeasuredBlock {
  block: Block;
  height: number;
}
export interface ResumePage {
  blocks: Block[];
  continuation?: string;
  overflow: boolean;
}
export function paginate(
  items: MeasuredBlock[],
  capacity: number,
  continuationHeight = 28,
): ResumePage[] {
  const pages: ResumePage[] = [];
  let page: ResumePage = { blocks: [], overflow: false },
    used = 0;
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    let group = item.height;
    for (
      let next = index;
      items[next]?.block.keepNext && items[next + 1];
      next++
    )
      group += items[next + 1].height;
    if (used + group > capacity && page.blocks.length) {
      pages.push(page);
      const continuation =
        item.block.type !== 'section' ? item.block.section : undefined;
      page = { blocks: [], continuation, overflow: false };
      used = continuation ? continuationHeight : 0;
    }
    page.blocks.push(item.block);
    used += item.height;
    if (used > capacity + 0.5) page.overflow = true;
  }
  if (page.blocks.length || !pages.length) pages.push(page);
  return pages;
}
