<script>
  import {t, dictionary, locale} from "svelte-i18n";
  import {fade, fly, slide} from "svelte/transition";
  import {DEFAULT_ZOOM} from "config/defaults";
  import {changes, grid, history, isTextReady, message, shield, showGrid, state, tinctures} from "data/stores";
  import {charges, divisions, ordinaries} from "data/dataModel";
  import {shields} from "data/shields";
  import {createConfig, generate, getTincture} from "scripts/generator";
  import {P, ra, rw} from "scripts/utils";
  import COA from "./../object/COA.svelte";
  import EditorAbove from "./EditorAbove.svelte";
  import EditorCharge from "./EditorCharge.svelte";
  import EditorControls from "./EditorControls.svelte";
  import EditorDivided from "./EditorDivided.svelte";
  import EditorDivision from "./EditorDivision.svelte";
  import EditorField from "./EditorField.svelte";
  import EditorGeneral from "./EditorGeneral.svelte";
  import EditorInscription from "./EditorInscription.svelte";
  import EditorLayered from "./EditorLayered.svelte";
  import EditorLine from "./EditorLine.svelte";
  import EditorOrdinary from "./EditorOrdinary.svelte";
  import EditorOutside from "./EditorOutside.svelte";
  import EditorPath from "./EditorPath.svelte";
  import EditorPosition from "./EditorPosition.svelte";
  import EditorRestore from "./EditorRestore.svelte";
  import EditorShadow from "./EditorShadow.svelte";
  import EditorShield from "./EditorShield.svelte";
  import EditorShift from "./EditorShift.svelte";
  import EditorStroke from "./EditorStroke.svelte";
  export let historyId, seed;

  let menu = {};
  let section = {field: 0, division: 0, ordinary: [], charge: [], inscription: []};
  const isLandscape = innerWidth > innerHeight;

  $state.transform = null;
  $state.positions = null;

  let coa = $history[historyId] || generate(seed || undefined); // on load
  $: restore($changes); // on undo/redo
  $: reroll(historyId); // on reroll
  $: update(menu); // on menu update
  $: edit(coa); // on edit
  $: localStorage.setItem("grid", $grid); // on grid change
  $: localStorage.setItem("showGrid", $showGrid); // on grid change

  function reroll(historyId) {
    coa = $history[historyId] || generate(seed || undefined);
    if (!$history[historyId]) $history.push(coa);
    changes.reset();
    defineMenuState();
  }

  function edit(coa) {
    changes.add(JSON.stringify(coa));
  }

  const toggleSection = (name, index) => () => {
    if (index !== undefined) {
      section[name][index] = !section[name][index];
    } else {
      section[name] = !section[name];
    }
  };

  // get coa from menu on menu change
  function update() {
    // remove seed reference as it would be confusing
    delete coa.seed;

    function getTinctureFromField(field) {
      if (field.type === "tincture") return field.t1;
      const type = field.type === "semy" ? "semy_of_" + field.charge : field.pattern;
      const attributes = [type, field.t1, field.t2];
      if (field.size !== "standard") attributes.push(field.size);
      return attributes.join("-");
    }

    // shield attribute changed
    coa.shield = menu.shield;

    // name attribute changed
    if (menu.name) {
      coa.name = menu.name;
    } else {
      delete coa.name;
    }

    // zoom attribute changed
    if (menu.zoom !== DEFAULT_ZOOM) {
      coa.zoom = menu.zoom;
    } else {
      delete coa.zoom;
    }

    // field attributes changed
    coa.t1 = getTinctureFromField(menu.field);

    // division attributes changed
    if (menu.division.division && menu.division.division !== "no") {
      coa.division = {division: menu.division.division};
      if (divisions[menu.division.division]) coa.division.line = menu.division.line;
      coa.division.t = getTinctureFromField(menu.division);
    }
    else {
      delete coa.division;
      menu.charges.forEach(c => c.divided = "");
      menu.ordinaries.forEach(o => o.divided = "");
    }

    // ordinary attributes changed
    if (menu.ordinaries.length) {
      coa.ordinaries = menu.ordinaries.map(o => {
        const item = {ordinary: o.ordinary, t: getTinctureFromField(o.field)};
        if (ordinaries.lined[o.ordinary]) item.line = o.line;
        if (coa.division && o.divided) item.divided = o.divided;
        if (o.showStroke) item.stroke = o.stroke;
        if (o.showStroke && o.strokeWidth !== 1) item.strokeWidth = o.strokeWidth;
        if (o.size && o.size !== 1) item.size = o.size;
        if (o.x || o.y) {
          item.x = o.x;
          item.y = o.y;
        }
        if (o.angle) item.angle = o.angle;
        if (o.above) item.above = true;
        return item;
      });
    } else delete coa.ordinaries;

    // charges attributes changed
    if (menu.charges.length) {
      coa.charges = menu.charges.map(c => {
        updateFields(c);
        const item = {charge: c.charge, t: getTinctureFromField(c.field1), p: c.p, size: c.size};
        if (charges.data[c.charge]?.colors > 1 && c.field2) {
          const t2 = getTinctureFromField(c.field2);
          if (t2 != item.t) item.t2 = t2;
        }
        if (charges.data[c.charge]?.colors > 2 && c.field3) {
          const t3 = getTinctureFromField(c.field3);
          if (t3 != item.t) item.t3 = t3;
        }
        if (!c.showStroke) item.stroke = "none";
        else if (c.stroke !== "#000000") item.stroke = c.stroke;
        if (c.divided) item.divided = c.divided;
        if (c.sinister) item.sinister = 1;
        if (c.reversed) item.reversed = 1;
        if (c.layered && charges.data[c.charge]?.layered && c.outside !== "around") item.layered = 1;
        if (c.outside && (charges.data[c.charge]?.layered || c.outside !== "around")) item.outside = c.outside;
        if (c.x || c.y) {
          item.x = c.x;
          item.y = c.y;
        }
        if (c.angle) item.angle = c.angle;
        return item;
      });
    } else delete coa.charges;

    // inscriptions attributes changed
    if (menu.inscriptions.length) {
      coa.inscriptions = menu.inscriptions.map(i => {
        const item = {text: i.text, font: i.font, size: i.size, path: i.path};
        if (i.bold) item.bold = 1;
        if (i.italic) item.italic = 1;
        if (i.color !== "#000000") item.color = i.color;
        if (i.spacing !== 0) item.spacing = i.spacing;
        if (i.shadow) item.shadow = i.shadow;
        return item;
      });
    } else delete coa.inscriptions;
  }

  function restore() {
    if (!changes.length()) return;
    coa = JSON.parse($changes[0]);
    defineMenuState();
  }

  function getField(fieldStr) {
    const type = isSemy(fieldStr) ? "semy" : isPattern(fieldStr) ? "pattern" : "tincture";
    let t1,
      t2,
      pattern = "vair",
      charge = "lozenge",
      category = "conventional",
      size = "standard";

    const field = fieldStr.split("-"); // parsed field tincture

    if (type === "tincture") {
      t1 = fieldStr;
      t2 = selectSecondTincture(fieldStr);
    } else {
      t1 = field[1];
      t2 = field[2];
      size = field[3] || "standard";
    }

    if (type === "pattern") pattern = field[0];
    else if (type === "semy") {
      charge = getSemyCharge(field);
      category = getChargeCategory(charge);
    }

    return {type, t1, t2, pattern, charge, category, size};
  }

  function updateFields(charge) {
    const colors = charges.data[charge.charge]?.colors || 1;
    if (colors === 1) {
      delete charge.field2;
      delete charge.field3;
    } else if (colors === 2) {
      charge.field2 ||= getField(charge.field1.t1);
      delete charge.field3;
    }
    else {
      charge.field2 ||= getField(charge.field1.t1);
      charge.field3 ||= getField(charge.field1.t1);
    }
  }

  // define initial menu state
  function defineMenuState() {
    // Shield
    menu.shield = coa.shield;

    // Name
    menu.name = coa.name;

    // Zoom
    menu.zoom = coa.zoom || DEFAULT_ZOOM;

    // Field
    menu.field = getField(coa.t1);

    // Division
    if (coa.division) {
      menu.division = getField(coa.division.t);
      menu.division.division = coa.division.division;
      menu.division.line = coa.division.line || "straight";
    }
    else {
      menu.division = getField(selectSecondTincture(menu.field.t1));
      menu.division.division = "no";
      menu.division.line = "straight";
    }

    // Ordinaries
    menu.ordinaries = getOrdinaries();
    function getOrdinaries() {
      if (!coa.ordinaries) return [];

      const ordinaries = coa.ordinaries.map(o => {
        const {ordinary, t} = o;
        const field = getField(t);
        const line = o.line || "straight";
        const showStroke = Boolean(o.stroke);
        const stroke = o.stroke || "#000000";
        const strokeWidth = o.strokeWidth || 1;
        const size = o.size || 1;
        const x = o.x || 0;
        const y = o.y || 0;
        const angle = o.angle || 0;
        const divided = o.divided || "";
        const above = o.above || false;
        if (angle) $state.transform = `rotate(${angle})`;
        return {ordinary, field, line, showStroke, stroke, strokeWidth, size, x, y, angle, divided, above};
      });

      return ordinaries;
    }

    // Charges
    menu.charges = getCharges();
    function getCharges() {
      if (!coa.charges) return [];
      return coa.charges.map(c => {
        const {charge, t, t2, t3, p, size} = c;
        const type = getChargeCategory(charge);
        const showStroke = c.stroke !== "none";
        const stroke = showStroke && c.stroke ? c.stroke : "#000000";
        const divided = c.divided || "";
        const sinister = c.sinister || false;
        const reversed = c.reversed || false;
        const layered = c.layered || false;
        const outside = c.outside || "";
        const x = c.x || 0;
        const y = c.y || 0;
        const angle = c.angle || 0;
        if (angle) $state.transform = `rotate(${angle})`;
        const chargeObj = {
          charge,
          type,
          showStroke,
          stroke,
          divided,
          field1: getField(t),
          p,
          size,
          sinister,
          reversed,
          layered,
          outside,
          x,
          y,
          angle
        };
        if (charges.data[charge]?.colors > 1) chargeObj.field2 = getField(t2 || t);
        if (charges.data[charge]?.colors > 2) chargeObj.field3 = getField(t3 || t);
        return chargeObj;
      });
    }

    // Inscriptions
    menu.inscriptions = getInscriptions();
    function getInscriptions() {
      if (!coa.inscriptions) return [];
      const inscriptions = coa.inscriptions.map(i => {
        const {text, font, size, shadow} = i;
        const bold = i.bold || false;
        const italic = i.italic || false;
        const color = i.color || "#000000";
        const spacing = i.spacing || 0;
        const path = i.path || "M-50 0 L50 0";
        return {text, font, size, bold, italic, spacing, color, path, shadow};
      });

      return inscriptions;
    }

    return menu;
  }

  function isPattern(string) {
    return string?.includes("-");
  }

  function isSemy(string) {
    return string?.slice(0, 4) === "semy";
  }

  function getSemyCharge(array) {
    return array[0].split("_of_")[1];
  }

  function getChargeCategory(charge) {
    const type = Object.keys(charges.types).find(type => charges[type][charge] !== undefined);
    return type || charge;
  }

  function getShieldType(shield) {
    return Object.keys(shields.types).find(type => shields[type][shield] !== undefined);
  }

  function selectSecondTincture(t1) {
    const metal = t1 === "argent" || t1 === "or";
    return rw(metal ? $tinctures.colours : $tinctures.metals);
  }

  function selectChargeTincture() {
    return getTincture(createConfig(), "charge", [], coa.t1);
  }

  function addOrdinary() {
    const ordinariesList = Object.keys(ordinaries.lined).concat(Object.keys(ordinaries.straight));
    const ordinary = ra(ordinariesList);
    const t = selectChargeTincture();
    const o = {
      ordinary,
      field: getField(t),
      showStroke: false,
      stroke: "#000000",
      strokeWidth: 1,
      line: "straight",
      size: 1,
      above: false,
      x: 0,
      y: 0,
      angle: 0,
      divided: ""
    };
    menu.ordinaries = [...menu.ordinaries, o];
  }

  function addCharge() {
    const type = rw(charges.single);
    const charge = rw(charges[type]);
    const t = selectChargeTincture();
    const c = {
      charge,
      field1: getField(t),
      p: "e",
      showStroke: true,
      stroke: "#000000",
      type,
      size: 1.5,
      sinister: false,
      reversed: false,
      layered: false,
      x: 0,
      y: 0,
      angle: 0,
      divided: "",
      outside: ""
    };
    if (charges.data[charge]?.colors > 1) c.field2 = getField(P(0.25) ? selectChargeTincture() : t);
    if (charges.data[charge]?.colors > 2) c.field3 = getField(P(0.5) ? selectChargeTincture() : t);
    menu.charges = [...menu.charges, c];
  }

  function addInscription() {
    const i = {
      text: "Armoria",
      font: "Cinzel",
      size: 20,
      bold: false,
      italic: false,
      spacing: 0,
      color: "#000000",
      path: "M-50 0 L50 0"
    };
    menu.inscriptions = [...menu.inscriptions, i];
  }

  if (!("ontouchstart" in window) && (coa.ordinaries || coa.charges)) {
    if (!$message) message.info("info.tipEditControls");
  }

  function isRaster(charge) {
    const el = document.getElementById(charge);
    return el ? el.tagName === "image" : false;
  }

  $: translateSafely = (group, key) => {
    const isInDictionary = $dictionary?.[$locale]?.[group]?.[key];
    return isInDictionary ? $t(`${group}.${key}`) : key;
  };
</script>

<main out:fade>
  <div class="coaContainer" in:fly={{x: isLandscape ? 0 : 1000, y: isLandscape ? 1000 : 0, duration: 800}}>
    {#key coa}
      <COA {coa} i="Edit" />
    {/key}

    {#if $state.selectedPath !== -1}
      <div class="bottom" transition:fly={{y: 1000, duration: 400}}>
        <button on:click={() => ($state.selectedPath = -1)}>{$t("editor.unselect")}</button>
      </div>
    {/if}
  </div>

  <div id="menu" in:fly={{x: isLandscape ? 1000 : 0, y: isLandscape ? 0 : 1000, duration: 1000}}>
    <!-- General -->
    <div class="section" class:expanded={section.general} on:click={toggleSection("general")}>
      {#if $isTextReady}
        {$t("editor.general")}
      {/if}
    </div>
    {#if section.general}
      <div class="panel" transition:slide>
        <EditorGeneral bind:name={menu.name} bind:zoom={menu.zoom} />
      </div>
    {/if}

    <!-- Shield -->
    <div class="section" class:expanded={section.shield} on:click={toggleSection("shield")}>
      {#if $isTextReady}
        {$t("editor.shield")}: {coa.shield ? $t(`shield.${getShieldType(coa.shield)}.${coa.shield}`) : $t("editor.default")}
        {#if coa.shield}
          <EditorRestore callback={() => (menu.shield = undefined)} />
        {/if}
      {/if}
    </div>
    {#if section.shield}
      <div class="panel" transition:slide>
        <div class="subsection">
          <EditorShield bind:shield={menu.shield} t1={coa.t1} />
        </div>
      </div>
    {/if}

    <!-- Field -->
    <div class="section" class:expanded={section.field} on:click={toggleSection("field")}>
      {#if $isTextReady}
        {$t("tinctures.field")}
      {/if}
    </div>
    {#if section.field}
      <div class="panel" transition:slide>
        <EditorField bind:field={menu.field} shield={coa.shield} />
      </div>
    {/if}

    <!-- Division -->
    <div class="section" class:expanded={section.division} on:click={toggleSection("division")}>
      {#if $isTextReady}
        {$t("tinctures.division")}: {translateSafely("divisions", menu.division.division)}
      {/if}
    </div>
    {#if section.division}
      <div class="panel" transition:slide>
        <div class="subsection">
          <EditorDivision
            bind:division={menu.division.division}
            t1={coa.t1}
            t2={coa.division ? coa.division.t : menu.division.t1}
            line={menu.division.line}
            shield={coa.shield}
          />
        </div>

        {#if divisions[coa.division?.division]}
          <div class="subsection">
            <EditorLine
              bind:line={menu.division.line}
              division={menu.division.division}
              t1={coa.t1}
              t2={coa.division ? coa.division.t : menu.division.t1}
              shield={coa.shield}
            />
          </div>
        {/if}

        {#if coa.division}
          <EditorField bind:field={menu.division} shield={coa.shield} />
        {/if}
      </div>
    {/if}

    <!-- Ordinaries -->
    {#each menu.ordinaries as o, i}
      <div
        class="section"
        transition:slide
        class:expanded={section.ordinary[i]}
        on:click={toggleSection("ordinary", i)}
      >
        {#if $isTextReady}
          {$t("editor.ordinary")}{menu.ordinaries.length > 1 ? ` ${i + 1}` : ""}: {translateSafely(
            "ordinaries",
            o.ordinary
          )}
          {#if o.above}
            <i>[{$t("editor.aboveCharges")}]</i>
          {/if}
          <EditorControls bind:els={menu.ordinaries} el={o} {i} />
        {/if}
      </div>
      {#if section.ordinary[i]}
        <div class="panel" transition:slide>
          {#if coa.division}
            <div class="subsection">
              <EditorDivided bind:divided={o.divided} />
            </div>
          {/if}

          <div class="subsection">
            <EditorOrdinary bind:ordinary={o.ordinary} t1={coa.t1} line={o.line} t2={o.field.t1} shield={coa.shield} />
          </div>

          {#if ordinaries.lined[o.ordinary]}
            <div class="subsection">
              <EditorLine bind:line={o.line} ordinary={o.ordinary} t1={coa.t1} t2={o.field.t1} shield={coa.shield} />
            </div>
          {/if}

          {#if o.divided !== "counter"}
            <div class="subsection">
              <EditorField bind:field={o.field} shield={coa.shield} />
            </div>
          {/if}

          <div class="subsection">
            {#if !["bordure", "orle"].includes(o.ordinary)}
              <EditorStroke bind:element={o} />
            {/if}
            <EditorAbove bind:above={o.above} />
          </div>

          <div class="subsection">
            <EditorShift bind:element={o} />
          </div>
        </div>
      {/if}
    {/each}

    <!-- Charges -->
    {#each menu.charges as charge, i}
      <div class="section" transition:slide class:expanded={section.charge[i]} on:click={toggleSection("charge", i)}>
        {#if $isTextReady}
          {$t("tinctures.charge")}{menu.charges.length > 1 ? ` ${i + 1}` : ""}: {translateSafely(
            "charges",
            charge.charge
          )}
          {#if charge.outside === "above"}
            <i>[{$t("editor.aboveShield")}]</i>
          {:else if charge.outside === "below"}
            <i>[{$t("editor.belowShield")}]</i>
          {:else if charge.outside === "around"}
            <i>[{$t("editor.aroundShield")}]</i>
          {/if}
          <EditorControls bind:els={menu.charges} el={charge} {i} />
        {/if}
      </div>
      {#if section.charge[i]}
        <div class="panel" transition:slide>
          <div class="subsection">
            {#if coa.division && !charge.outside}
              <EditorDivided bind:divided={charge.divided} raster={isRaster(charge.charge)} />
            {/if}
            <EditorCharge
              type="charge"
              bind:charge={charge.charge}
              bind:category={charge.type}
              t1={coa.t1}
              t2={charge.field1.t1}
              t3={charge.field2?.t1}
              t4={charge.field3?.t1}
              sinister={charge.sinister}
              reversed={charge.reversed}
              division={coa.division}
              shield={coa.shield}
            />
          </div>

          {#if !isRaster(charge.charge) && charge.divided !== "counter"}
            {#if charges.data[charge.charge]?.colors > 1}
            <div class="subsection">{$t("editor.primaryTincture")}:</div>
            {/if}
            <EditorField bind:field={charge.field1} shield={coa.shield} />
            {#if charges.data[charge.charge]?.colors > 1}
              <div class="subsection">{$t("editor.secondaryTincture")}:</div>
              <EditorField bind:field={charge.field2} shield={coa.shield} />
              {#if charges.data[charge.charge]?.colors > 2}
                <div class="subsection">{$t("editor.tertiaryTincture")}:</div>
                <EditorField bind:field={charge.field3} shield={coa.shield} />
              {/if}
            {/if}
          {/if}

          <div class="subsection">
            <EditorStroke bind:element={charge} />
          </div>

          <div class="subsection">
            <EditorPosition bind:charge />
            {#if charges.data[charge.charge]?.layered && charge.outside !== "around"}
              <EditorLayered bind:layered={charge.layered} />
            {/if}
            {#if !charge.divided}
              <EditorOutside charge={charge.charge} bind:outside={charge.outside} />
            {/if}
          </div>

          <div class="subsection">
            <EditorShift bind:element={charge} />
          </div>
        </div>
      {/if}
    {/each}

    <!-- Inscriptions -->
    {#each menu.inscriptions as inscription, i}
      <div
        class="section"
        transition:slide
        class:expanded={section.inscription[i]}
        on:click={toggleSection("inscription", i)}
      >
        {#if $isTextReady}
          {$t("editor.inscription")}{menu.inscriptions.length > 1 ? ` ${i + 1}` : ""}: {inscription.text}
          <EditorControls bind:els={menu.inscriptions} el={inscription} {i} />
        {/if}
      </div>
      {#if section.inscription[i]}
        <div class="panel" transition:slide>
          <div class="subsection">
            <EditorInscription bind:inscription />
          </div>

          <div class="subsection">
            <EditorShadow bind:shadow={inscription.shadow} />
          </div>

          <div class="subsection">
            <EditorPath bind:path={inscription.path} />
          </div>
        </div>
      {/if}
    {/each}

    {#if $isTextReady}
      <div class="buttonLine" on:click={addOrdinary}>{$t("editor.addOrdinary")}</div>
      <div class="buttonLine" on:click={addCharge}>{$t("editor.addCharge")}</div>
      <div class="buttonLine" on:click={addInscription}>{$t("editor.addInscription")}</div>
    {/if}
  </div>
</main>

<style>
  main {
    width: 100%;
    height: calc(100% - 45px);
    display: grid;
    justify-items: center;
    grid-template-columns: auto minmax(40%, 60%);
    user-select: none;
  }

  @media only screen and (orientation: portrait) {
    main {
      grid-template-columns: none;
      grid-template-rows: minmax(25%, 1fr) auto;
    }
  }

  div.coaContainer {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  div.bottom {
    position: absolute;
    bottom: 1em;
  }

  div.bottom > button {
    background-color: #11111180;
    border: none;
    color: #fff;
    padding: 0.5em 1em;
  }

  div.bottom > button:hover {
    transition: all 0.2s ease-out;
    background-color: #111111;
  }

  #menu {
    width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-width: thin;
    transition: 1s;
    background-color: #11111180;
  }

  #menu::-webkit-scrollbar {
    width: 6px;
    background-color: #cccccc80;
  }

  #menu::-webkit-scrollbar-thumb {
    background-color: #111;
  }

  .section {
    position: relative;
    padding: 1em 1.14em;
    color: #fff;
    background-color: #00000060;
    cursor: pointer;
    transition: background-color 0.1s ease;
    overflow-x: hidden;
  }

  .section:hover {
    background-color: #00000080;
  }

  .section:after {
    content: "\276F";
    transition: 0.2s ease-out;
    margin-top: -0.1em;
    float: right;
  }

  .expanded:after {
    transform: rotate(90deg);
  }

  :global(.section > span) {
    transition: 1s ease-out;
    opacity: 0;
    margin-left: 0.6em;
  }

  :global(.section:hover > span) {
    opacity: 1;
  }

  .section > i {
    font-size: smaller;
  }

  .panel {
    min-width: 100%;
    max-width: max-content;
    background-color: #13131320;
    overflow: hidden;
  }

  .buttonLine {
    padding: 1em 1.14em;
    color: #fff;
    background-color: #00000040;
    cursor: pointer;
    transition: background-color 0.1s ease;
  }

  .buttonLine:hover {
    background-color: #00000080;
  }

  :global(.subsection) {
    color: #fff;
    padding: 0.5em 0.5em 0.5em 1em;
  }

  :global(.items) {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  }

  :global(.item) {
    position: relative;
    cursor: pointer;
    max-width: 200px;
    transition: background-color 0.2s ease;
  }

  :global(.item:hover) {
    background-color: #ffffff10;
  }

  :global(.item:active) {
    transform: translateY(1px);
  }

  :global(.item.selected) {
    background-color: #ffffff15;
  }
</style>
