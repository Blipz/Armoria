<script lang="ts">
  // @ts-check
  import {t} from "svelte-i18n";
  import EditorItem from "./EditorItem.svelte";
  import {divisions} from "data/dataModel";
  export let division: string;
  export let t1: string;
  export let t2: string;
  export let line: string;
  export let shield: string = undefined;

  const divisionList = ["no"].concat(Object.keys(divisions.variants));
  $: divisionsData = divisionList.map(division => ({t1, shield, division: {division, t: t2, line}}));

  const getTip = (division: string) => {
    const divisionName = $t(`divisions.${division}`);
    return `${$t("editor.division")}: ${divisionName}`;
  };

  const handleChange = (newDivision: string) => () => {
    division = newDivision;
  };
</script>

<div class="items">
  {#each divisionsData as coa (coa)}
    <div class="item" class:selected={division === coa.division.division} on:click={handleChange(coa.division.division)}>
      <EditorItem {coa} tip={getTip(coa.division.division)} />
    </div>
  {/each}
</div>
