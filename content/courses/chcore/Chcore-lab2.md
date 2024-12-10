---
title: 内存管理
description: 内存管理，伙伴系统（Buddy System）与页表配置（Page Table） 重回中文写作
tags: [OS, IPADS]
date: 2023-09-01
lastmod: 2024-12-10
draft: false
---


# Before Lab

在做实验之前，我们需要做以下步骤：

```bash
git pull
git checkout lab2
git merge lab1
```

> 注意一定要合并 `lab1`，否则会导致机器无法启动

# 配置内核启动页表


在 `kernel/arch/aarch64/boot/raspi3/init/mmu.c` 中配置内核的地址映射，想法是很朴素的，与 `xv6` 的做法相似，将 `va = 0xffff_ff00_0000_0000 + addr` 映射到了 `pa = addr` 的位置，可以引申 `xv6` 的映射方式：

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230911165905.png)

但 `aarch64` 方便的一点在于他有两个页表寄存器，`risc-v` 只有一个 `satp`，我们通过如下配置：

```c
vaddr = PHYSMEM_START;

boot_ttbr1_l0[GET_L0_INDEX(vaddr + KERNEL_VADDR)] =
		((u64)boot_ttbr1_l1) | IS_TABLE | IS_VALID | NG;
boot_ttbr1_l1[GET_L1_INDEX(vaddr + KERNEL_VADDR)] =
		((u64)boot_ttbr1_l2) | IS_TABLE | IS_VALID | NG;

/* Step 2: map PHYSMEM_START ~ PERIPHERAL_BASE with 2MB granularity */

for (; vaddr < PERIPHERAL_BASE; vaddr += SIZE_2M) {
		boot_ttbr1_l2[GET_L2_INDEX(vaddr + KERNEL_VADDR)] =
				(vaddr) | UXN | ACCESSED | NG | INNER_SHARABLE
				| NORMAL_MEMORY | IS_VALID;
}

/* Step 2: map PERIPHERAL_BASE ~ PHYSMEM_END with 2MB granularity */

for (vaddr = PERIPHERAL_BASE; vaddr < PHYSMEM_END; vaddr += SIZE_2M) {
		boot_ttbr1_l2[GET_L2_INDEX(vaddr + KERNEL_VADDR)] =
				(vaddr) | UXN | ACCESSED | NG | INNER_SHARABLE
				| DEVICE_MEMORY | IS_VALID;
}
```

> 如果一开始不会写，没关系，可以看看上面几行里是如何配置用户进程的页表的，我们的做法仅仅是将虚拟地址变为高地址，并配置到内核的页表寄存器中

# 伙伴系统

> 请看完银杏书再来写这个实验，否则体验会很差

但在这里还是简单介绍以下伙伴系统。

实际上想法很简单，我们维护一个数组（假定全局只有这一个），这个数组的索引表示阶(i.e. `order`)，可以看作是物理块的大小（$2^{order}$），数组的每一项是一个`struct` ，这个结构体维护了一个链表和链表的长度（或许我们就可以把它当作是一个链表），链表维护了物理内存中大小为 $2^{order}$ 的物理块。

而所谓的伙伴系统，实际上我们可以简化成如下两个函数：

1. 操作系统申请了一块大小为 `m` 的内存，我们首先定阶，找到最适合的一块物理块，如果没有，那么我们向上找，并将大的不断均分，直到找到最合适的，在均分的过程中，我们需要将分离出来的物理块放到对应的链表中去。
2. 操作系统需要回收一块大小为 `m` 的内存，我们首先需要找到这块内存的伙伴（不用担心，这部分已经写好了函数），由于伙伴的大小和这块内存是一样的，所以我们只需要不断向上合并，直到无法合并为止。

当然，还有实现上的很多细节没有说明，但有这个思路后已经不难了。我们首先来实现第一个功能

## buddy_get_pages


```c
struct page *page = NULL;
u64 current_order = order;

while (current_order < BUDDY_MAX_ORDER
	   && pool->free_lists[current_order].nr_free == 0) {
		current_order++;
}

if (current_order >= BUDDY_MAX_ORDER) {
		kwarn("Memory Request order %d Exceeded\n", order);
		return NULL;
}

page = list_entry(pool->free_lists[current_order].free_list.next,
				  struct page,
				  node);

if (page == NULL) {
		kinfo("No Satisfaction Memory For the order %d\n", order);
		return NULL;
}

page = split_page(pool, order, page);
page->allocated = 1;

return page;

```

注意这里实现上的细节：

1. 检查当前需要分配的内存是否大于最大的块（检查 `order` 的大小即可）
2. 由于维护了链表，我们需要用到 `common/list.h` 中的函数，包括 `list_add`, `list_del`, `list_entry`
3. 找到了合适大小的块（或者需要分裂的块）后，我们通过分裂函数进行修正，保证其是最合适的块
4. `allocated` 置为 `1`，表面这个块已经被分配

接着，我们开始完善 `split_page`，这个函数需要做的事情是很简单的，只需要不断的分裂即可，但需要在分裂时维护链表，我们直接给出实现：

```c
if (page->allocated) {
		kwarn("The page 0x%lx is allocated\n", page);
		return NULL;
}

page->allocated = 0;
list_del(&page->node);
pool->free_lists[page->order].nr_free--;

while (page->order > order) {
		page->order--;
		struct page *buddy = get_buddy_chunk(pool, page);
		if (buddy != NULL) {
				buddy->allocated = 0;
				buddy->order = page->order;

				list_add(&buddy->node,
						 &pool->free_lists[buddy->order].free_list);
				pool->free_lists[buddy->order].nr_free++;
		}
}

return page;
```

需要注意的细节：

1. 首先我们需要检查分裂的块是否被分配了，如果被分配了那么显然暂时不能分配
2. 通过 `get_buddy_chunk` 获得分裂后的块的另一半，将这个 `buddy` 放到对应的空闲链表中去（记得维护贡献出大物理块的链表）

## buddy_free_pages

第二个功能就很简单了，实际上就是第一个的逆向：

```c
static struct page *merge_page(struct phys_mem_pool *pool, struct page *page)
{
        /* LAB 2 TODO 2 BEGIN */
        /*
         * Hint: Recursively merge current chunk with its buddy
         * if possible.
         */

        if (page->allocated) {
                kwarn("The page 0x%lx was allocated\n", page);
                return NULL;
        }

        list_del(&page->node);
        pool->free_lists[page->order].nr_free--;

        while (page->order < BUDDY_MAX_ORDER - 1) {
                struct page *buddy = get_buddy_chunk(pool, page);

                if (buddy == NULL || buddy->allocated
                    || buddy->order != page->order) {
                        break;
                }

                page = page < buddy ? page : buddy;

                buddy->allocated = 1;
                list_del(&buddy->node);
                pool->free_lists[buddy->order].nr_free--;

                page->order += 1;
        }

        page->allocated = 0;
        list_add(page, &pool->free_lists[page->order].free_list);
        pool->free_lists[page->order].nr_free++;

        return page;

        /* LAB 2 TODO 2 END */
}

void buddy_free_pages(struct phys_mem_pool *pool, struct page *page)
{
        /* LAB 2 TODO 2 BEGIN */
        /*
         * Hint: Merge the chunk with its buddy and put it into
         * a suitable free list.
         */

        if (!page->allocated) {
                kwarn("The page 0x%lx was not allocated\n", page);
                return;
        }

        page->allocated = 0;
        list_add(page, &pool->free_lists[page->order].free_list);
        pool->free_lists[page->order].nr_free++;
        merge_page(pool, page);

        return;

        /* LAB 2 TODO 2 END */
}
```
> 注意这一步： `page = page < buddy ? page : buddy`
> 
> 我们并不知道找到的伙伴哪个的地址更低，但我们需要保证，我们合并进链表时，一定是低地址在前，换而言之，我们总是把高地址放在低地址后面（这是很显然的事情）


做完这一步后，我们可以输入 `make qemu`，如果没有出现 `BUG` 停顿的话，说明 `kmalloc` 已经正常工作了（也就是你的伙伴系统已经正确了）

> 这里有一个奇怪的 `bug`，当你做完 `buddy system` 后，测试似乎不会停下来，我甚至跑了 10 分钟的测试，他都没停下来，但输入 `make grade` 的话就又正常了，这个 `bug` 会导致页表管理部分没办法 `debug`，只能肉眼差错。

# 页表管理

> 一定一定去提前看 `page_table.h` 和文档后再来做这部分

## query_in_pgtbl

这个函数是 `trival` 的，在 `xv6` 中也做过这个函数的实现，简单来说，我们通过 `get_next_ptp` 来找到下一级页表，直到找到最后的 `PTE`，然后通过 `offset` 来获取 `pa`

但在这里，我们需要注意：

1. L1 与 L2 页表可以直接指向物理块，因此我们需要对这部分进行判断
2. 记得看 `get_next_ptp` 的实现还有它的注释，我们需要用到 `virt_to_phys` 这个函数，如果不看的话就不知道，

```c
int query_in_pgtbl(void *pgtbl, vaddr_t va, paddr_t *pa, pte_t **entry)
{
        /* LAB 2 TODO 3 BEGIN */
        /*
         * Hint: Walk through each level of page table using `get_next_ptp`,
         * return the pa and pte until a L0/L1 block or page, return
         * `-ENOMAPPING` if the va is not mapped.
         */

        ptp_t *cur_ptp = (ptp_t *)pgtbl;
        ptp_t *next_ptp;
        ptp_t *next_pte;
        int res = 0;

        for (int i = 0; i < 4; i++) {
                res = get_next_ptp(cur_ptp, i, va, &next_ptp, &next_pte, false);
                if (res == -ENOMAPPING) {
                        return -ENOMAPPING;
                }
                if (res == BLOCK_PTP) {
                        *entry = next_pte;
                        switch (i) {
                        case 1:
                                *pa = virt_to_phys((vaddr_t)next_ptp)
                                      + GET_VA_OFFSET_L1(va);
                                break;
                        case 2:
                                *pa = virt_to_phys((vaddr_t)next_ptp)
                                      + GET_VA_OFFSET_L2(va);
                                break;
                        case 3:
                                *pa = virt_to_phys((vaddr_t)next_ptp)
                                      + GET_VA_OFFSET_L3(va);
                                break;
                        default:
                                break;
                        };
                        return 0;
                }
                cur_ptp = next_ptp;
        }

        *entry = next_pte;
        *pa = virt_to_phys((vaddr_t)next_ptp) + GET_VA_OFFSET_L3(va);
        return 0;

        /* LAB 2 TODO 3 END */
}
```

> 请注意高亮位置（可能并不是很亮），这里使用了 `return` 而非 `break`，但注意如果你使用了 `break`，它甚至不会报错（除非你做到了最后一个测试点才会报错），我的建议是在这里使用 `goto`，就像我在下面做的一样。

## (un)map_range_in_pgtbl


以 `map_range_in_pgtbl` 为例，我们的做法是显然的：

1. 找到最后的 `PTE`
2. 将 `pa` 的偏移量写入这个 `PTE` 的 `PFN` 中
3. 设置 `PTE` 的 `flags`

于是，代码如下：

```c
int map_range_in_pgtbl(void *pgtbl, vaddr_t va, paddr_t pa, size_t len,
                       vmr_prop_t flags)
{
        /* LAB 2 TODO 3 BEGIN */
        /*
         * Hint: Walk through each level of page table using `get_next_ptp`,
         * create new page table page if necessary, fill in the final level
         * pte with the help of `set_pte_flags`. Iterate until all pages are
         * mapped.
         */

        ptp_t *l0_ptp, *l1_ptp, *l2_ptp, *l3_ptp;
        pte_t *l0_pte, *l1_pte, *l2_pte, *l3_pte;
        int res = 0;

        if (pgtbl == NULL) {
                kwarn("%s: input arg is NULL.\n", __func__);
                return;
        }

        l0_ptp = (ptp_t *)pgtbl;

        const vaddr_t va_bottom = va + len;
        for (; va < va_bottom; va += PAGE_SIZE, pa += PAGE_SIZE) {
                res = get_next_ptp(l0_ptp, 0, va, &l1_ptp, &l0_pte, true);
                if (res < 0) {
                        break;
                }
                res = get_next_ptp(l1_ptp, 1, va, &l2_ptp, &l1_pte, true);
                if (res < 0) {
                        break;
                }
                res = get_next_ptp(l2_ptp, 2, va, &l3_ptp, &l2_pte, true);
                if (res < 0) {
                        break;
                }

                l3_pte = &(l3_ptp->ent[GET_L3_INDEX(va)]);
                l3_pte->l3_page.is_valid = 1;
                l3_pte->l3_page.is_page = 1;
                l3_pte->l3_page.pfn = pa >> PAGE_SHIFT;

                set_pte_flags(l3_pte, flags, USER_PTE);
        }

        return res;

        /* LAB 2 TODO 3 END */
}
```

注意高亮部分的处理即可。

而关于 `unmap` 的部分，相较于 `map` 应该更为简单，我们只需要将 `is_valid` 字段置为 0 即可，如下：

```c
int unmap_range_in_pgtbl(void *pgtbl, vaddr_t va, size_t len)
{
        /* LAB 2 TODO 3 BEGIN */
        /*
         * Hint: Walk through each level of page table using `get_next_ptp`,
         * mark the final level pte as invalid. Iterate until all pages are
         * unmapped.
         */

        ptp_t *l0_ptp, *l1_ptp, *l2_ptp, *l3_ptp;
        pte_t *l0_pte, *l1_pte, *l2_pte, *l3_pte;
        int res = 0;

        if (pgtbl == NULL) {
                kwarn("%s: input arg is NULL.\n", __func__);
                return;
        }

        l0_ptp = (ptp_t *)pgtbl;

        const vaddr_t va_bottom = va + len;
        for (; va < va_bottom; va += PAGE_SIZE) {
                res = get_next_ptp(l0_ptp, 0, va, &l1_ptp, &l0_pte, true);
                if (res < 0) {
                        break;
                }
                res = get_next_ptp(l1_ptp, 1, va, &l2_ptp, &l1_pte, true);
                if (res < 0) {
                        break;
                }
                res = get_next_ptp(l2_ptp, 2, va, &l3_ptp, &l2_pte, true);
                if (res < 0) {
                        break;
                }

                l3_pte = &(l3_ptp->ent[GET_L3_INDEX(va)]);
                l3_pte->l3_page.is_valid = 0;
                l3_pte->l3_page.is_page = 0;
        }

        return res;

        /* LAB 2 TODO 3 END */
}
```

但注意高亮部份为 `true` 以保证所有条目都会被清除（后续的也类似）

## (un)map_range_in_pgtbl_huge

这部分的内容更为简单一些，如果过不去测试可以看看是不是 `query` 写错了。

做法分三步：

1. 分配 1G 的大页，直到不够一个 1G 大页
2. 分配 2M 的大页，中止条件同上
3. 剩余部分通过 `map_range_in_pgtbl` 分配 4KB 页表来完成

注意的是我们需要时刻维护 `len` 这个变量（因为最后的函数需要用到），代码如下：

```c
int map_range_in_pgtbl_huge(void *pgtbl, vaddr_t va, paddr_t pa, size_t len,
                            vmr_prop_t flags)
{
        /* LAB 2 TODO 4 BEGIN */

        ptp_t *l0_ptp, *l1_ptp, *l2_ptp;
        pte_t *l0_pte, *l1_pte, *l2_pte;
        int res = 0;

        if (pgtbl == NULL) {
                kwarn("%s: input arg is NULL.\n", __func__);
                return;
        }

        l0_ptp = (ptp_t *)pgtbl;

#define PAGE_SIZE_1G       (PAGE_SIZE * L1_PER_ENTRY_PAGES)
#define PAGE_SIZE_1G_SHIFT (PAGE_SHIFT + PAGE_ORDER + PAGE_ORDER)
#define PAGE_SIZE_2M       (PAGE_SIZE * L2_PER_ENTRY_PAGES)
#define PAGE_SIZE_2M_SHIFT (PAGE_SHIFT + PAGE_ORDER)

        const vaddr_t va_bottom = va + len;

        while (va + PAGE_SIZE_1G < va_bottom) {
                res = get_next_ptp(l0_ptp, 0, va, &l1_ptp, &l0_pte, true);
                if (res < 0) {
                        goto back;
                }

                l1_pte = &(l1_ptp->ent[GET_L1_INDEX(va)]);
                l1_pte->l1_block.is_valid = 1;
                l1_pte->l1_block.is_table = 0;
                l1_pte->l1_block.pfn = pa >> PAGE_SIZE_1G_SHIFT;
                set_pte_flags(l1_pte, flags, USER_PTE);

                va += PAGE_SIZE_1G;
                pa += PAGE_SIZE_1G;
                len -= PAGE_SIZE_1G;
        }

        while (va + PAGE_SIZE_2M < va_bottom) {
                res = get_next_ptp(l0_ptp, 0, va, &l1_ptp, &l0_pte, true);
                if (res < 0) {
                        goto back;
                }
                res = get_next_ptp(l1_ptp, 1, va, &l2_ptp, &l1_pte, true);
                if (res < 0) {
                        goto back;
                }

                l2_pte = &(l2_ptp->ent[GET_L2_INDEX(va)]);
                l2_pte->l2_block.is_valid = 1;
                l2_pte->l2_block.is_table = 0;
                l2_pte->l2_block.pfn = pa >> PAGE_SIZE_2M_SHIFT;
                set_pte_flags(l2_pte, flags, USER_PTE);

                va += PAGE_SIZE_2M;
                pa += PAGE_SIZE_2M;
                len -= PAGE_SIZE_2M;
        }

        res = map_range_in_pgtbl(pgtbl, va, pa, len, flags);

back:
        return res;

        /* LAB 2 TODO 4 END */
}
```

注意这里定义的宏即可，关于这个宏的定义，请参考此图：

![lab2-pte-1.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/lab2-pte-1.png)

> 

> 参考此图 `block` 中的 `output address` 位置即可, 我们用的还是 4KB 的粒度


# 实验结果

```bash
make grade
```

![image.png](https://virgil-civil-1311056353.cos.ap-shanghai.myqcloud.com/img/20230911193104.png)
