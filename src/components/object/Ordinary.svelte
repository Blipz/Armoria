<script>
  import "path-data-polyfill";
  import {shield} from "data/stores";
  import {drag, transform} from "scripts/drag";
  import {getTemplate} from "scripts/getters";
  import {highlight, lowlight} from "scripts/highlight";
  export let coa, ordinary, i, shieldPath, t, type;

  let stroke, width;
  $: {
    stroke = ordinary.stroke || "none";
    width = ordinary.strokeWidth || 1;
  }

  function addDrag(event) {
    if (type !== "Edit") return;
    drag(event, ordinary, coa);
  }

  let dashes, dashes1, dashes2;
  $: {
    dashes = [0];
    if (ordinary.dash > 0) {
      let aveDashLen = ordinary.dash;
      let p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", shieldPath);
      let data = p.getPathData();
      let merge = {
        round: [4],
        heater: [1,2,2],
        embowed: [1,2,2],
        french: [1,2,2],
        oldFrench: [1,2,2],
        spanish: [1,3],
        horsehead: [6,2],
        vesicaPiscis: [2,2],
        kite: [6],
        baroque: [2,10,9],
        renaissance: [4,4,1,2,1],
        polish: [2,1,2,3,3,2,1,2],
        hessen: [1,4,1,2],
        swiss: [2,2,2,2],
        boeotian: [1,1,1,4,1,1,1,1,4,1],
        targe: [1,4,3,1,1],
        targe2: [1,4,2,1],
        fantasy1: [1,2,2,1],
        fantasy4: [1,4,1],
      }[coa.shield || $shield] || Array(data.length - 2).fill(1);
      let counter = 1;
      let start = "M" + data[0].values[0] + "," + data[0].values[1];
      for (let i=0; i<merge.length; i++) {
        let prev = data[counter-1].values;
        let path = start;
        for (let j=0; j<merge[i]; j++) {
          path += data[counter+j].type + data[counter+j].values;
        }
        counter += merge[i];
        let seg = document.createElementNS("http://www.w3.org/2000/svg", "path");
        seg.setAttribute("d", path);
        let segLen = seg.getTotalLength();
        let end = seg.getPointAtLength(segLen);
        start = "M" + end.x + "," + end.y;
        let numDashes = Math.round(0.5 + segLen / aveDashLen / 2) * 2 - 1;
        if (merge.length === 1 && (coa.shield || $shield) !== "kite") numDashes = Math.round(segLen / aveDashLen / 2) * 2;
        let dashLen = segLen / numDashes;
        dashes.push(dashes.pop() + dashLen);
        while (--numDashes > 0) {
          dashes.push(dashLen);
        }
      }
      dashes.pop();
      dashes.push(1000);
      if (dashes.length % 2) dashes.push(0);
    }
  }
</script>

<g
  class="ordinary"
  {i}
  transform={transform(ordinary)}
  fill={t}
  {stroke}
  stroke-width={width}
  on:mousedown={addDrag}
  on:mouseenter={type === "Edit" ? highlight("menu", "ordinary", i) : null}
  on:mouseleave={type === "Edit" ? lowlight("menu", "ordinary", i) : null}
>
  {#if ordinary.ordinary === "bordure"}
    <path d={shieldPath} fill="none" stroke={t} stroke-width="33.3" stroke-dasharray={dashes.join(" ")} />
  {:else if ordinary.ordinary === "orle"}
    <path d={shieldPath} fill="none" stroke={t} stroke-width="10" stroke-dasharray={dashes.join(" ")} transform="translate(15 15) scale(.85)" />
  {:else}
    <!-- Remove superfluous <g> for Svelte >= 3.48 (see https://github.com/sveltejs/svelte/issues/7450) -->
    <g>{@html getTemplate(ordinary.ordinary, ordinary.line)}</g>
  {/if}
</g>
