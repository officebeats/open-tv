import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Channel } from '../../../models/channel';
import { TauriService } from '../../../services/tauri.service';
import { ViewMode } from '../../../models/viewMode';
import { ToastrService } from 'ngx-toastr';
import { MemoryService } from '../../../memory.service';

/**
 * Library Curator System 3.0 (Formerly Focus Manager)
 */

export interface CategoryGroup {
  id?: number;
  name: string;
  hidden: boolean;
  itemCount: number; // For visualization
}

export interface GroupFamily {
  prefix: string; // "UK", "USA", "FR"
  totalCount: number; // Total sub-categories
  hiddenCount: number; // Hidden sub-categories
  status: 'ALL' | 'NONE' | 'PARTIAL';
  children: CategoryGroup[]; // The actual items
  isSelected: boolean; // For action selection
  expanded: boolean; // For drill-down
}

@Component({
  selector: 'app-category-manager-modal',
  templateUrl: './category-manager-modal.component.html',
  styleUrls: ['./category-manager-modal.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class CategoryManagerModalComponent implements OnInit {
  categories: Channel[] = [];
  groupFamilies: GroupFamily[] = [];

  selectedFamilyPrefixes: Set<string> = new Set();

  searchQuery: string = '';
  loading: boolean = true;

  selectedIds: Set<number> = new Set(); // For bulk selection
  selectedPrefixes: Set<string> = new Set();

  hasChanges: boolean = false;

  constructor(
    public activeModal: NgbActiveModal,
    private tauri: TauriService,
    private toastr: ToastrService,
    private memory: MemoryService,
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  get totalFamilyCount(): number {
    return this.groupFamilies.length;
  }

  get hiddenFamilyCount(): number {
    return this.groupFamilies.filter((f) => f.status === 'NONE').length;
  }

  async loadCategories() {
    this.loading = true;
    try {
      const categories = await this.tauri.call<Channel[]>('search', {
        filters: {
          view_type: ViewMode.Categories,
          page: 0,
          use_keywords: false,
          source_ids: Array.from(this.memory.Sources.keys()),
          media_types: [0, 1, 2],
          show_hidden: true,
          sort: 0,
          query: '',
        },
      });

      this.categories = categories;
      this.processData();
    } catch (e) {
      this.toastr.error('Failed to load categories');
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  processData() {
    this.applyGrouping();
  }

  filterList() {
    this.applyGrouping();
  }

  // --- Logic: Grouping Algorithm 2.0 ---
  private applyGrouping() {
    const query = this.searchQuery.toLowerCase();
    const familyMap = new Map<string, Channel[]>();

    // Improved Regex for Country Codes: UK, USA, FR, DE, etc.
    // Handles: "[UK] News", "UK: Sports", "UK - Movies", "UK|VIP"
    const prefixRegex = /^([\[\(]?[\w\s]{2,8}[\]\)]?[:| \-]*)/i;

    for (const cat of this.categories) {
      if (query && !(cat.name || '').toLowerCase().includes(query)) continue;

      const name = cat.name || '';
      let prefix = 'OTHER';

      const match = name.match(prefixRegex);
      if (match && match[1]) {
        // Clean the prefix
        let raw = match[1]
          .replace(/[\[\]\(\):|]/g, '')
          .trim()
          .toUpperCase();

        // Validation: Don't group if it looks like a generic word
        if (raw.length >= 2 && raw.length <= 6) {
          prefix = raw;
        } else if (raw === 'GENERAL' || raw === 'VIP' || raw === '4K') {
          prefix = raw;
        }
      }

      if (!familyMap.has(prefix)) familyMap.set(prefix, []);
      familyMap.get(prefix)!.push(cat);
    }

    this.groupFamilies = Array.from(familyMap.entries())
      .map(([prefix, items]) => {
        const total = items.length;
        const hiddenCount = items.filter((i) => i.hidden).length;

        let status: 'ALL' | 'NONE' | 'PARTIAL' = 'PARTIAL';
        if (hiddenCount === total)
          status = 'NONE'; // All hidden
        else if (hiddenCount === 0) status = 'ALL'; // All visible

        // Map children for the accordion
        const children: CategoryGroup[] = items
          .map((i) => ({
            id: i.id,
            name: i.name || 'Unknown',
            hidden: i.hidden || false,
            itemCount: 0, // We don't have channel counts here easily without extra queries
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        return {
          prefix,
          totalCount: total,
          hiddenCount,
          status,
          children,
          isSelected: this.selectedFamilyPrefixes.has(prefix),
          expanded: query.length > 0, // Auto-expand on search
        };
      })
      .sort((a, b) => {
        // Priority Sorting
        const priorities = ['US', 'USA', 'UK', 'GB', 'CA', 'CAN', 'AU', 'NZ'];
        const aIdx = priorities.indexOf(a.prefix);
        const bIdx = priorities.indexOf(b.prefix);

        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;

        return a.prefix.localeCompare(b.prefix);
      });
  }

  /**
   * Selection Logic
   */
  toggleFamilySelection(family: GroupFamily, event: MouseEvent) {
    if (event) event.stopPropagation();

    family.isSelected = !family.isSelected;
    if (family.isSelected) {
      this.selectedPrefixes.add(family.prefix);
    } else {
      this.selectedPrefixes.delete(family.prefix);
    }
  }

  get numSelected(): number {
    return this.groupFamilies.filter((f) => f.isSelected).length;
  }

  get selectedActionType(): 'HIDE' | 'SHOW' {
    const selected = this.groupFamilies.filter((f) => f.isSelected);
    if (selected.length === 0) return 'HIDE';

    const hiddenCount = selected.filter((f) => f.status === 'NONE').length;
    // If more than half are hidden, suggest "SHOW"
    return hiddenCount > selected.length / 2 ? 'SHOW' : 'HIDE';
  }

  async runSelectionAction(type: 'HIDE' | 'SHOW' | 'FOCUS') {
    const selectedFamilies = this.groupFamilies.filter((f) => f.isSelected);
    if (selectedFamilies.length === 0) return;

    let idsToModify: number[] = [];
    let newState: boolean;

    if (type === 'FOCUS') {
      // Focus Mode: Hide EVERY category except the ones mentioned in selection
      idsToModify = this.categories
        .filter((c) => typeof c.id === 'number')
        .map((c) => c.id) as number[];
      newState = true;

      // We actually want to hide all, then UNHIDE the selected ones
      await this.tauri.call('hide_groups_bulk', { group_ids: idsToModify, hidden: true });

      // Now unhide selected
      const selectedIds = selectedFamilies.flatMap((f) => f.children.map((c) => c.id));
      await this.tauri.call('hide_groups_bulk', { group_ids: selectedIds, hidden: false });

      this.toastr.success(`Focused ${selectedFamilies.length} groups.`);
    } else {
      newState = type === 'HIDE';
      idsToModify = selectedFamilies.flatMap((f) =>
        f.children.map((c) => c.id).filter((id) => typeof id === 'number'),
      ) as number[];

      await this.tauri.call('hide_groups_bulk', { group_ids: idsToModify, hidden: newState });
      this.toastr.success(`${newState ? 'Archived' : 'Restored'} ${idsToModify.length} items.`);
    }

    this.hasChanges = true;
    this.loadCategories(); // Reload to refresh statuses
  }

  // --- Logic: Toggle Actions ---

  /**
   * Toggles an entire family.
   * If any are hidden => Show All.
   * If all are visible => Hide All.
   */
  async toggleFamily(family: GroupFamily, event: MouseEvent) {
    if (event) event.stopPropagation();
    if (this.loading) return;

    this.loading = true;

    // Determine target state
    // Simple Toggle Logic: If it's fully visible, we hide it. Otherwise we show it.
    const hideTarget = family.status === 'ALL';

    try {
      // Safety: Ensure valid IDs and cast to integers
      const ids = family.children
        .map((c) => c.id)
        .filter((id) => typeof id === 'number')
        .map((id) => Math.floor(id!));

      if (ids.length === 0) {
        this.toastr.warning('No valid items to toggle in this family.');
        return;
      }

      console.log(
        `[Curator] Toggling family ${family.prefix} (${hideTarget ? 'HIDE' : 'SHOW'}) IDs:`,
        ids,
      );
      await this.tauri.call('hide_groups_bulk', { group_ids: ids, hidden: hideTarget });

      // Update Local State
      family.children.forEach((c) => (c.hidden = hideTarget));
      family.hiddenCount = hideTarget ? family.totalCount : 0;
      family.status = hideTarget ? 'NONE' : 'ALL';

      this.hasChanges = true;
    } catch (e) {
      console.error(e);
      this.toastr.error('Failed to toggle family');
    } finally {
      this.loading = false;
    }
  }

  toggleExpanded(family: GroupFamily, event: MouseEvent) {
    event.stopPropagation();
    family.expanded = !family.expanded;
  }

  // --- Logic: Sub-Category Toggle ---
  async toggleSubCategory(child: CategoryGroup, family: GroupFamily) {
    if (this.loading) return;
    this.loading = true;

    const newHiddenState = !child.hidden;

    try {
      // Single toggle (using bulk api for simplicity with array of 1)
      const id = Math.floor(child.id!);
      console.log(`[Curator] Toggling sub-category ${child.name} (ID: ${id}) -> ${newHiddenState}`);

      await this.tauri.call('hide_groups_bulk', { group_ids: [id], hidden: newHiddenState });

      // Update Local
      child.hidden = newHiddenState;

      // Re-calc family status
      const hiddenCount = family.children.filter((c) => c.hidden).length;
      family.hiddenCount = hiddenCount;

      if (hiddenCount === family.totalCount) family.status = 'NONE';
      else if (hiddenCount === 0) family.status = 'ALL';
      else family.status = 'PARTIAL';

      this.hasChanges = true;
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  // --- Bulk Global Actions ---

  async hideAll() {
    if (!confirm('Archive ALL categories? This will hide everything from your view.')) return;
    await this.applyBulkGlobal(true);
  }

  async unhideAll() {
    if (!confirm('Restore ALL categories? This resets everything to visible.')) return;
    await this.applyBulkGlobal(false);
  }

  private async applyBulkGlobal(hidden: boolean) {
    this.loading = true;
    try {
      const targetIds = this.groupFamilies.flatMap((f) =>
        f.children.map((c) => c.id).filter((id) => typeof id === 'number'),
      ) as number[];

      if (targetIds.length > 0) {
        await this.tauri.call('hide_groups_bulk', { group_ids: targetIds, hidden });
      }

      // Update Local
      this.groupFamilies.forEach((f) => {
        f.children.forEach((c) => (c.hidden = hidden));
        f.hiddenCount = hidden ? f.totalCount : 0;
        f.status = hidden ? 'NONE' : 'ALL';
      });
      this.hasChanges = true;
    } catch (e) {
      console.error(e);
      this.toastr.error('Bulk action failed');
    } finally {
      this.loading = false;
    }
  }

  closeModal() {
    if (this.hasChanges) {
      this.activeModal.close(true);
    } else {
      this.activeModal.dismiss();
    }
  }
}
