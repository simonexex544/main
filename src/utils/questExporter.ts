import { QuestChapter, QuestLine } from '../types/modpack';

function toSnbtHexId(seed: string, index: number): string {
  let hash = 2166136261 ^ index;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const high = (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
  const low = ((index + 1) * 2654435761 >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return `${high}${low}`;
}

function escapeSnbt(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function serializeChapterToSnbt(chapter: QuestChapter, chapterIndex: number): string {
  const chapterId = toSnbtHexId(chapter.id, chapterIndex);
  const questIdMap = new Map<string, string>();
  chapter.quests.forEach((q, idx) => {
    questIdMap.set(q.id, toSnbtHexId(`${chapter.id}_${q.id}`, idx + 10));
  });

  const questsBlock = chapter.quests
    .map((q, qIdx) => {
      const qHex = questIdMap.get(q.id) || toSnbtHexId(q.id, qIdx);
      const deps = (q.dependencies || [])
        .map((d) => questIdMap.get(d))
        .filter(Boolean)
        .map((hex) => `\t\t\t\t"${hex}"`)
        .join('\n');

      const tasks = q.objectives
        .map((obj, oIdx) => {
          const objHex = toSnbtHexId(`${q.id}_obj_${obj.id}`, oIdx + 100);
          if (obj.type === 'checkmark') {
            return `\t\t\t\t{\n\t\t\t\t\tid: "${objHex}"\n\t\t\t\t\ttitle: "${escapeSnbt(obj.title)}"\n\t\t\t\t\ttype: "checkmark"\n\t\t\t\t}`;
          }
          if (obj.type === 'kill') {
            return `\t\t\t\t{\n\t\t\t\t\tid: "${objHex}"\n\t\t\t\t\ttype: "kill"\n\t\t\t\t\tentity: "${escapeSnbt(obj.target)}"\n\t\t\t\t\tvalue: ${obj.count || 1}L\n\t\t\t\t}`;
          }
          return `\t\t\t\t{\n\t\t\t\t\tid: "${objHex}"\n\t\t\t\t\titem: { count: ${obj.count || 1}, id: "${escapeSnbt(obj.target)}" }\n\t\t\t\t\ttype: "item"\n\t\t\t\t}`;
        })
        .join('\n');

      const rewards = q.rewards
        .map((rew, rIdx) => {
          const rewHex = toSnbtHexId(`${q.id}_rew_${rew.id}`, rIdx + 200);
          if (rew.type === 'item' && rew.item) {
            return `\t\t\t\t{\n\t\t\t\t\tid: "${rewHex}"\n\t\t\t\t\titem: { count: ${rew.count || 1}, id: "${escapeSnbt(rew.item)}" }\n\t\t\t\t\ttype: "item"\n\t\t\t\t}`;
          }
          return `\t\t\t\t{\n\t\t\t\t\tid: "${rewHex}"\n\t\t\t\t\ttype: "xp"\n\t\t\t\t\txp: ${rew.xp || 50}\n\t\t\t\t}`;
        })
        .join('\n');

      return `\t\t{\n\t\t\tdependencies: [${deps ? `\n${deps}\n\t\t\t` : ''}]\n\t\t\tdescription: ["${escapeSnbt(q.description)}"]\n\t\t\ticon: { id: "${escapeSnbt(q.iconItem || 'minecraft:book')}" }\n\t\t\tid: "${qHex}"\n\t\t\toptional: ${q.isSideQuest ? 'true' : 'false'}\n\t\t\trewards: [\n${rewards}\n\t\t\t]\n\t\t\ttasks: [\n${tasks}\n\t\t\t]\n\t\t\ttitle: "${escapeSnbt(q.title)}"\n\t\t\tx: ${q.x}.0d\n\t\t\ty: ${q.y}.0d\n\t\t}`;
    })
    .join('\n');

  return `{\n\tdefault_hide_dependency_lines: false\n\tdefault_quest_shape: ""\n\tfilename: "${escapeSnbt(chapter.id)}"\n\tgroup: ""\n\ticon: { id: "${escapeSnbt(chapter.iconItem || 'minecraft:book')}" }\n\tid: "${chapterId}"\n\torder_index: ${chapterIndex}\n\tquest_links: [ ]\n\tquests: [\n${questsBlock}\n\t]\n\tsubtitle: ["${escapeSnbt(chapter.subtitle || '')}"]\n\ttitle: "${escapeSnbt(chapter.title)}"\n}\n`;
}

export function exportQuestLineToSnbtFiles(questLine: QuestLine): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  questLine.chapters.forEach((chapter, idx) => {
    const safeId = chapter.id.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || `chapter_${idx + 1}`;
    files.push({
      path: `config/ftbquests/quests/chapters/${safeId}.snbt`,
      content: serializeChapterToSnbt(chapter, idx),
    });
  });

  files.push({
    path: 'config/ftbquests/quests/data.snbt',
    content: `{\n\tdefault_autoclaim_rewards: "disabled"\n\tdefault_consume_items: false\n\tdefault_quest_disable_jei: false\n\tdefault_quest_shape: "circle"\n\tdrop_loot_crates: false\n\tprogression_mode: "linear"\n\ttitle: "${escapeSnbt(questLine.title)}"\n\tversion: 13\n}\n`,
  });

  return files;
}
