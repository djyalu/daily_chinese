const $ = (selector) => document.querySelector(selector);

const state = {
  categories: [],
  levels: [],
  shas: {
    categories: null,
    levels: null,
  },
};

const configFields = {
  owner: $("#owner"),
  repo: $("#repo"),
  branch: $("#branch"),
  token: $("#token"),
  categoriesPath: $("#categoriesPath"),
  levelsPath: $("#levelsPath"),
};

const statusText = $("#statusText");

function setStatus(message, tone = "info") {
  const prefixes = {
    info: "•",
    success: "✓",
    error: "!",
  };
  statusText.textContent = `${prefixes[tone]} ${message}`;
}

function saveConfig() {
  const payload = {};
  Object.entries(configFields).forEach(([key, input]) => {
    payload[key] = input.value.trim();
  });
  localStorage.setItem("dc_admin_config", JSON.stringify(payload));
  setStatus("Config saved locally.", "success");
}

function loadConfig() {
  const raw = localStorage.getItem("dc_admin_config");
  const defaults = {
    owner: "",
    repo: "",
    branch: "main",
    token: "",
    categoriesPath: "data/categories.json",
    levelsPath: "data/levels.json",
  };
  const data = raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  Object.entries(configFields).forEach(([key, input]) => {
    input.value = data[key] || "";
  });
}

function getConfig() {
  const cfg = {};
  Object.entries(configFields).forEach(([key, input]) => {
    cfg[key] = input.value.trim();
  });
  return cfg;
}

function encodeContent(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function decodeContent(base64) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function loadFile(path, kind) {
  const { owner, repo, branch, token } = getConfig();
  if (!owner || !repo || !token) {
    throw new Error("Owner, repo, and token are required.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }

  const data = await response.json();
  const content = decodeContent(data.content || "");
  state.shas[kind] = data.sha;
  return JSON.parse(content);
}

function buildRow(kind, item, index) {
  const row = document.createElement("div");
  row.className = "row";
  row.style.setProperty("--i", index);
  row.dataset.kind = kind;

  const fields =
    kind === "category"
      ? [
          ["id", "ID"],
          ["name", "Name"],
          ["description", "Description", "textarea"],
        ]
      : [
          ["id", "ID"],
          ["label", "Label"],
          ["order", "Order"],
          ["description", "Description", "textarea"],
        ];

  fields.forEach(([key, label, type]) => {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const input =
      type === "textarea" ? document.createElement("textarea") : document.createElement("input");
    input.value = item[key] ?? "";
    input.dataset.key = key;
    if (key === "order") {
      input.type = "number";
      input.min = "1";
    }
    wrapper.appendChild(input);
    row.appendChild(wrapper);
  });

  const toggle = document.createElement("label");
  toggle.className = "toggle";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = item.active !== false;
  checkbox.dataset.key = "active";
  toggle.appendChild(checkbox);
  toggle.appendChild(document.createTextNode("Active"));
  row.appendChild(toggle);

  const remove = document.createElement("button");
  remove.className = "remove";
  remove.type = "button";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => {
    const list = kind === "category" ? state.categories : state.levels;
    list.splice(index, 1);
    render(kind);
  });
  row.appendChild(remove);

  return row;
}

function render(kind) {
  const container = kind === "category" ? $("#categoryRows") : $("#levelRows");
  const list = kind === "category" ? state.categories : state.levels;
  container.innerHTML = "";
  list.forEach((item, index) => {
    container.appendChild(buildRow(kind, item, index));
  });
}

function readFromDom(kind) {
  const container = kind === "category" ? $("#categoryRows") : $("#levelRows");
  const rows = Array.from(container.querySelectorAll(".row"));
  return rows.map((row) => {
    const item = {};
    row.querySelectorAll("[data-key]").forEach((input) => {
      const key = input.dataset.key;
      if (input.type === "checkbox") {
        item[key] = input.checked;
      } else if (key === "order") {
        item[key] = Number(input.value || 0);
      } else {
        item[key] = input.value.trim();
      }
    });
    return item;
  });
}

function validateList(kind, list) {
  const missing = list.find((item) => !item.id);
  if (missing) {
    throw new Error(`${kind} items must have an id.`);
  }
}

async function saveFile(path, kind, list) {
  const { owner, repo, branch, token } = getConfig();
  const content = JSON.stringify(list, null, 2);

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        message: `Update ${path} via admin`,
        content: encodeContent(content),
        sha: state.shas[kind],
        branch,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to save ${path}: ${response.status}`);
  }

  const data = await response.json();
  state.shas[kind] = data.content?.sha || state.shas[kind];
}

$("#saveConfig").addEventListener("click", saveConfig);

$("#loadData").addEventListener("click", async () => {
  try {
    setStatus("Loading data...");
    state.categories = await loadFile(getConfig().categoriesPath, "categories");
    state.levels = await loadFile(getConfig().levelsPath, "levels");
    render("category");
    render("level");
    setStatus("Data loaded.", "success");
  } catch (err) {
    setStatus(err.message || "Failed to load data.", "error");
  }
});

$("#addCategory").addEventListener("click", () => {
  state.categories.push({
    id: "",
    name: "",
    description: "",
    active: true,
  });
  render("category");
});

$("#addLevel").addEventListener("click", () => {
  state.levels.push({
    id: "",
    label: "",
    description: "",
    order: state.levels.length + 1,
    active: true,
  });
  render("level");
});

$("#saveCategories").addEventListener("click", async () => {
  try {
    const list = readFromDom("category");
    validateList("Category", list);
    await saveFile(getConfig().categoriesPath, "categories", list);
    state.categories = list;
    setStatus("Categories saved to repo.", "success");
  } catch (err) {
    setStatus(err.message || "Failed to save categories.", "error");
  }
});

$("#saveLevels").addEventListener("click", async () => {
  try {
    const list = readFromDom("level");
    validateList("Level", list);
    await saveFile(getConfig().levelsPath, "levels", list);
    state.levels = list;
    setStatus("Levels saved to repo.", "success");
  } catch (err) {
    setStatus(err.message || "Failed to save levels.", "error");
  }
});

loadConfig();
