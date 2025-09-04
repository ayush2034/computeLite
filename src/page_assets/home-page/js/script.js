import { postData,get_cl_element,confirmBox,executeQuery, fetchData, uploadFile,executePython,executeJavascript,executeR,addDefaultModel,fetchSchema } from "../../../assets/js/scc"
import {uploadExcel,downloadExcel,get_uploadExcel_info} from "../../../core/gridMethods"
import JSZip from "jszip"
const scc_one_modal = document.getElementById("scc-one-modal")

let excelUploadInfo = {}
let selectedFile = null
let imgBlob = null
const current_version = "1.0.0"
const params = new URLSearchParams(window.location.search)
const modelUID = params.get('modelUID');
let schema = {}
const icons_class = {'DB_Icon': 'fas fa-database'}
let tsk_id

document.addEventListener("DOMContentLoaded", async function() {
    
    schema = await fetchSchema()
    
    // Initialize the SQLite3 module
    let result = await executeQuery('init')

    if (!result || result.msg != 'Success'){
        confirmBox('Alert!','Some error occured while initializing sqlite.')
        return
    }
    

    if (modelUID){
        await postData('/home/get-attached-model',{modelId:`${modelUID}`})
        const url = window.location.origin + window.location.pathname;
        history.replaceState(null, '', url);        
    }

    await get_user_models();

    const shareBtn = document.getElementById('shareBtn');
    shareBtn.classList.add('blink');


    document.getElementById("editorBtn").onclick = async function(){
        const selected_model = document.getElementById("availableModal").querySelector("li.selected-button").innerText
        if (!selected_model){
            confirmBox("Alert!","Please select a model")
            return
        }    
        window.open(`./sqlEditor.html?tableName=V_TEMPV&modelName=${selected_model}`);
    }

    document.getElementById('availInpFiles').onclick = function(){
        const inputFileModal = document.getElementById('modal-input-files')
        inputFileModal.classList.remove("hidden", "opacity-0")
        inputFileModal.classList.add("flex")

        document.getElementById('modal-input-files').querySelector('h2').innerText = 'Input Files'
        populateInputFiles()
    } 
    
    document.getElementById('availOutFiles').onclick = function(){
        const inputFileModal = document.getElementById('modal-input-files')
        inputFileModal.classList.remove("hidden", "opacity-0")
        inputFileModal.classList.add("flex")

        document.getElementById('modal-input-files').querySelector('h2').innerText = 'Output Files'
        populateOutputFiles()
    } 

    
    document.getElementById("shareBtn").onclick = function(){
        const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
        if (!selected_model){
            confirmBox("Alert!","Please select a model")
            return
        }
        const modelName = selected_model.innerText
        const projectName = selected_model.getAttribute('project')
        window.open(`./editorPage.html?projectName=${projectName}&modelName=${modelName}`);
    }

    document.getElementById("notebookRBtn").onclick = function(){
        const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
        if (!selected_model){
            confirmBox("Alert!","Please select a model")
            return
        }
        const modelName = selected_model.innerText
        window.open(`./RNotebook.html?modelName=${modelName}`);
    }


    document.getElementById("closeOutput").onclick = function(){
        document.getElementById("outputDiv").classList.add("hidden");    
    }
    
    document.getElementById('uploadFiles').onclick = function(){
        const uploadFileModal = document.getElementById('modal-upload-files')
        uploadFileModal.classList.remove("hidden", "opacity-0")
        uploadFileModal.classList.add("flex")
    }

    document.getElementById('addScriptBtn').onclick = function(){
        const scriptModal = document.getElementById('modal-addScript')
        scriptModal.classList.remove("hidden", "opacity-0")
        scriptModal.classList.add("flex")
    }

    const headers = document.querySelectorAll('.accordion-header');
    headers.forEach(header => {
        header.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const content = document.getElementById(targetId);
            const svg = this.querySelector('svg');
            
            // Toggle current
            content.classList.toggle('hidden');
            
            // Rotate the + icon to form an × (45 degrees)
            if (content.classList.contains('hidden')) {
                svg.style.transform = 'rotate(0deg)';
            } else {
                svg.style.transform = 'rotate(45deg)';
            }
        });
    });

    document.getElementById("ok-view").onclick = create_view;
    document.getElementById("deleteModel").onclick = remove_modal.bind(null,true)
    document.getElementById("removeModel").onclick = remove_modal.bind(null,false)
    document.getElementById("addNew").onclick = get_newModel_modal.bind(null,"Add New Model",false)
    document.getElementById('downloadAllFiles').onclick = fetchFilesAndDownloadZip
    document.getElementById("addExisting").onclick = addExistingModel
    document.getElementById("saveAs").onclick = saveAsModel
    document.getElementById("uploadModel").onclick = uplaodModel
    document.getElementById("downloadModel").onclick = downloadModel
    document.getElementById("uploadExcel").onclick = uploadExcelFile
    document.getElementById("downloadExcel").onclick = downloadExcelFile
    document.getElementById("vacuum").onclick = vacuumModel
    document.getElementById('saveFiles').onclick = saveFiles
    document.getElementById("uploadPackage").onclick = uploadPackage
    document.getElementById('downloadOutput').onclick = downloadOutput

    await executePython('init','editor')
    shareBtn.classList.remove('blink');
});



const modalCloseBtn = document.getElementById("modal-close")

// Modal toggle
function showModal() {
  scc_one_modal.classList.remove("hidden", "opacity-0")
  scc_one_modal.classList.add("flex")
}

function hideModal() {
  scc_one_modal.classList.add("hidden")
  scc_one_modal.classList.remove("flex")
}

modalCloseBtn.addEventListener("click", hideModal)

function populate_modal(header_name, btn_text) {
    // Set modal header text
    const modal_header = scc_one_modal.querySelector('.flex h2');
    modal_header.innerText = header_name;

    // Clear modal body
    const modal_body = scc_one_modal.querySelector('.modal-body');
    modal_body.innerHTML = '';

    // Clear modal footer
    const modal_footer = scc_one_modal.querySelector('.modal-footer');
    modal_footer.innerHTML = '';

    // Create Cancel button
    const cancel_button = get_cl_element(
        'button',
        'btn-secondary',
        null,
        document.createTextNode('Cancel')
    );
    cancel_button.onclick = hideModal;

    // Create Add button
    const add_btn = get_cl_element(
        'button',
        'btn ml-auto',
        null,
        document.createTextNode(btn_text)
    );

    // Append buttons to footer
    modal_footer.appendChild(cancel_button);
    modal_footer.appendChild(add_btn);

    // Return modal body and add button
    return [modal_body, add_btn];
}


function get_newModel_modal(header, anotherModal = false) {
    const [modal_body, add_btn] = populate_modal(header, "Add");
    const form_div = get_cl_element("div", "space-y-4");

    // Model Name input
    form_div.appendChild(
        get_addModel_row('name_div', 'Model Name', 'db_name', 'normal', [], '', "fas fa-database")
    );

    // Model Path or Template input
    if (anotherModal) {
        form_div.appendChild(
            get_addModel_row('path_div', 'Model Path', 'db_path', 'normal')
        );
    } else {
        form_div.appendChild(
            get_addModel_row('template_div', 'Model Template', 'model_template', 'select', Object.keys(schema))
        );
    }

    modal_body.appendChild(form_div);

    add_btn.onclick = async function () {
        const model_name = document.getElementById('db_name').value.trim();
        if (!model_name || !valid_string(model_name)) {
            confirmBox("", "Please enter valid model name");
            return;
        }

        // Check for duplicate model name
        const modelList = document.getElementById("availableModal").querySelectorAll("li");
        for (let cn of modelList) {
            if (model_name === cn.innerText.trim()) {
                confirmBox("", `Model already active with same name ${model_name}`);
                return;
            }
        }

        let model_template = 'Sample DB';
        const template_el = document.getElementById('model_template');
        if (template_el) {
            model_template = template_el.value;
        }

        const project_name = 'Default';

        hideModal();

        const data = {
            model_name,
            model_template,
            project_name,
            schemas: schema,
            db_user: '',
            password: '',
            host: '',
            port: 0,
            db_type: 'SQLITE'
        };

        const res = await fetchData('home', 'addNewModel', data);

        if (res.msg === 'Success') {
            const model_body = document.getElementById("availableModal");
            model_body.appendChild(get_li_element([model_name, model_template, project_name, 'SQLITE']));
            model_body.lastChild.click();
            confirmBox("Success!", "New Model Added");
        } else {
            confirmBox("Alert!", res.msg);
        }
    };

    showModal();
}

function valid_string(string) {
    var pattern = /^[a-zA-Z0-9_]+$/;
    return pattern.test(string);
}

function get_addModel_row(div_id, label_text, id, input_type, options = [], placeholder_text = '', icon_class = '', input_typ = 'text') {
    // Main row container
    const mainDiv = get_cl_element("div", "flex flex-col sm:flex-row items-center mb-4", div_id);

    // Label
    const labelDiv = get_cl_element("div", "w-full sm:w-1/3 px-2");
    const label = get_cl_element("label", "block text-base font-semibold my-2", null, document.createTextNode(label_text));
    labelDiv.appendChild(label);

    // Input container
    const inputDiv = get_cl_element("div", "w-full sm:w-2/3 px-2");

    if (input_type === 'select') {
        const selectEl = get_cl_element("select", "w-full select", id);
        if (options.length === 0 || options.includes('Default')) {
            selectEl.appendChild(get_cl_element("option", null, null, document.createTextNode('Default')));
        }
        options.forEach(opt => {
            if (opt !== 'Default') {
                selectEl.appendChild(get_cl_element("option", null, null, document.createTextNode(opt)));
            }
        });
        if (selectEl.firstChild) selectEl.firstChild.setAttribute("selected", "");
        inputDiv.appendChild(selectEl);
    } else {
        const inputGroup = get_cl_element("div", "relative flex items-center");
        const inputEl = get_cl_element("input", "input", id);
        inputEl.type = input_typ;
        inputEl.placeholder = placeholder_text;
        inputGroup.appendChild(inputEl);

        if (icon_class && icon_class.trim()) {
            const iconSpan = get_cl_element("span", "absolute right-2 text-gray-400 pointer-events-none");
            iconSpan.appendChild(get_cl_element("span", icon_class));
            inputGroup.appendChild(iconSpan);
        }
        inputDiv.appendChild(inputGroup);
    }

    mainDiv.appendChild(labelDiv);
    mainDiv.appendChild(inputDiv);

    return mainDiv;
}

function  get_li_element(model_name) {
    const el = get_cl_element("li", "deselected-button mb-2 cursor-pointer");
    const el_child = get_cl_element("div", "flex items-center space-x-2");

    el_child.appendChild(get_cl_element("span", icons_class['DB_Icon']));
    el_child.appendChild(get_cl_element("span", "text-sm font-medium", null, document.createTextNode(model_name[0])));
    el.appendChild(el_child);

    el.setAttribute("project", model_name[2]);
    el.setAttribute("template", model_name[1]);
    el.setAttribute("dbtype", model_name[3]);

    el.onclick = async function (e) {
        const db_name = this.innerText;
        document.getElementById('outputTxt').innerHTML = "";

        if (!this.classList.contains("selected-button")) {
            // Upgrade version if needed
            const version = await fetchData('home', 'getVersion', { model_name: db_name });
            if (version !== current_version) {
                await fetchData('home', 'upgradeVersion', { modelName: db_name, db_version: version, current_version });
            }

            // Deselect other models
            for (const cn of this.parentNode.querySelectorAll("li.selected-button")) {
                cn.classList.remove("selected-button");
                cn.classList.add("deselected-button");
            }

            get_model_tables(db_name, el.getAttribute("template"));
            this.classList.add("selected-button");
            this.classList.remove("deselected-button");
            e.preventDefault();
        }

        // Ensure TaskType column exists
        const column_info = await executeQuery('fetchData', db_name, "PRAGMA table_info(S_TaskMaster)");
        const column_names = column_info.map(col => col[1]);
        if (!column_names.includes("TaskType")) {
            await executeQuery('executeQuery', db_name, "ALTER TABLE S_TaskMaster ADD COLUMN TaskType VARCHAR DEFAULT 'PythonScript'");
        }

        // Ensure required tables exist
        await executeQuery('executeQuery', db_name, `
            CREATE TABLE IF NOT EXISTS S_Notebooks (
                NotebookId INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                Name VARCHAR,
                Type VARCHAR,
                Status VARCHAR DEFAULT 'Active',
                CreationDate VARCHAR DEFAULT (datetime('now','localtime')),
                LastUpdateDate VARCHAR DEFAULT (datetime('now','localtime'))
            )
        `);

        await executeQuery('executeQuery', db_name, `
            CREATE TABLE IF NOT EXISTS S_NotebookContent (
                CellId INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                Name VARCHAR,
                NotebookId INTEGER NOT NULL,    
                CellContent VARCHAR,
                CellType VARCHAR,
                CreationDate VARCHAR DEFAULT (datetime('now','localtime')),
                LastUpdateDate VARCHAR DEFAULT (datetime('now','localtime'))
            )
        `);

        await executeQuery('executeQuery', db_name, `
            CREATE TABLE IF NOT EXISTS S_Queries (
                QueryId INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                Name VARCHAR UNIQUE,
                TableName VARCHAR,
                ShowSummary INTEGER NOT NULL,
                HideNullRows INTEGER NOT NULL,
                Levels VARCHAR DEFAULT '[]',
                Series VARCHAR DEFAULT '[]',
                SeriesProperties VARCHAR DEFAULT '{}',
                Layout VARCHAR DEFAULT '{}',
                GraphType VARCHAR,
                WorksheetProperties VARCHAR DEFAULT '{}',
                LevelsProperties VARCHAR DEFAULT '{}',
                CreationDate VARCHAR DEFAULT (datetime('now','localtime')),
                LastUpdateDate VARCHAR DEFAULT (datetime('now','localtime'))
            )
        `);

        await populateExecutableFiles(db_name);
    };

    return el;
}

async function get_model_tables(model_name, template) {
    const tableGroup = document.getElementById("tableGroup");
    tableGroup.innerHTML = "";
    const groups = await fetchData('home', 'fetchTableGroups', { model_name });

    Object.entries(groups).forEach(([groupName, tables]) => {
        tableGroup.appendChild(get_accordian(groupName, tables));
    });
}

async function get_user_models() {
    document.getElementById("tableGroup").innerHTML = "";
    let models = await fetchData('home', 'getUserModels');
    if (!models || models.length === 0) {
        const defaultModel = await addDefaultModel(schema);
        if (defaultModel && defaultModel.length > 0) {
            models.push(defaultModel);
        }
    }
    populate_tables(models);
    return models;
}

function populate_tables(model_names) {
    const model_body = document.getElementById("availableModal");
    model_body.innerHTML = "";
    model_names.forEach(model => {
        model_body.appendChild(get_li_element(model));
    });

    if (modelUID && model_body.lastChild) {
        model_body.lastChild.click();
    } else if (model_body.firstChild) {
        model_body.firstChild.click();
    }
}

function get_accordian(group_name, table_list) {
    const accordian_id = group_name.replace(/\s/g, "_");

    // Accordion wrapper
    const card_border = get_cl_element("div", "border border-border");

    // Accordion header (button)
    const button = get_cl_element(
        "button",
        "w-full flex justify-between items-center pl-6 pr-3 py-6 bg-transparent rounded-t cursor-pointer focus:outline-none accordion-header",
        accordian_id + "_head",
        get_cl_element("span", "font-medium text-card-foreground", null, document.createTextNode(group_name))
    );

    // SVG toggle icon (+)
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("h-4", "w-4", "transition-transform", "duration-200");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 5v14m-7-7h14");
    svg.appendChild(path);
    button.appendChild(svg);

    // Accordion content
    const card_body = get_cl_element("div", "accordion-content hidden px-4 pb-3", accordian_id);
    const tables_container = get_cl_element("div", "", null);
    card_body.appendChild(tables_container);

    // Add tables
    table_list.forEach(([tableId, tableName]) => {
        const el = get_cl_element(
            "div",
            "p-3 border-b-3 border-primary hover:bg-muted cursor-pointer",
            null,
            document.createTextNode(tableName)
        );
        el.setAttribute("tableName", tableId);
        el.onclick = function () {
            const selected_model = document.getElementById("availableModal").querySelector("li.selected-button");
            window.open(`./tableDisplay.html?tableName=${tableId}&modelName=${selected_model.innerText}`);
        };
        tables_container.appendChild(el);
    });

    // Assemble accordion
    card_border.appendChild(button);
    card_border.appendChild(card_body);

    // Toggle logic
    button.addEventListener("click", function () {
        const target_id = accordian_id;
        const content = document.getElementById(target_id);

        // Close other accordions
        document.querySelectorAll(".accordion-content").forEach(el => {
            if (el.id !== target_id) {
                el.classList.add("hidden");
                el.previousSibling.querySelector("svg").classList.remove("rotate-45");
            }
        });

        // Toggle current
        content.classList.toggle("hidden");
        svg.classList.toggle("rotate-45");
    });

    return card_border;
}

async function addExistingModel() {
    const [modal_body, add_btn] = populate_modal("Add Existing Models", "Add");
    const temp_dict = {};

    // Fetch existing models from backend
    const data = await fetchData('home', 'getExistingModels');
    const model_dict = {};

    // Organize models by project
    for (const cn of data) {
        const model_name = cn[0];
        const project_name = cn[1];
        temp_dict[model_name] = [project_name, cn[2], cn[3]];
        if (!model_dict[project_name]) {
            model_dict[project_name] = [];
        }
        model_dict[project_name].push([model_name, cn[2]]);
    }

    // Render tree UI for selection
    modal_body.appendChild(get_cl_tree(model_dict));

    add_btn.onclick = async function () {
        // Get currently active model names
        const active_models = Array.from(document.getElementById("availableModal").querySelectorAll("li"))
            .map(li => li.innerText);

        const projects_dict = {};
        const model_list = [];

        // Collect checked models from tree
        for (const cn of modal_body.querySelectorAll(".TreeMembers li")) {
            if (cn.parentNode.classList.contains("childList") && cn.firstChild.checked) {
                const model_name = cn.innerText;
                if (active_models.includes(model_name)) {
                    confirmBox('Alert!', `Model Already Active with name ${model_name}`);
                    return;
                }
                if (model_list.includes(model_name)) {
                    confirmBox('Alert!', "You Cannot Add more than one model of same name");
                    return;
                }
                const project_name = cn.parentNode.previousElementSibling.innerText;
                if (!projects_dict[project_name]) {
                    projects_dict[project_name] = [];
                }
                projects_dict[project_name].push(model_name);
                model_list.push(model_name);
            }
        }

        if (Object.keys(projects_dict).length > 0) {
            hideModal();
            // Add selected models via backend
            await fetchData('home', 'addExistingModels', { model_list, projects_dict });
            const model_body = document.getElementById("availableModal");
            for (const model_name of model_list) {
                model_body.appendChild(get_li_element([
                    model_name,
                    temp_dict[model_name][1],
                    temp_dict[model_name][0],
                    temp_dict[model_name][2]
                ]));
            }
        } else {
            hideModal();
        }
    };

    showModal();
}

function get_cl_tree(model_dict, parent_icon = "fa-server", project = null) {
    const tree = get_cl_element("ul", "tree pl-8 mb-4");
    for (const project_name in model_dict) {
        // Project parent node
        const parent_li = document.createElement("li");
        const parent = get_tree_li_element(project_name, parent_icon);
        parent_li.appendChild(parent);

        // Child models list
        const child_ul = get_cl_element("ul", "childList TreeMembers pl-8");
        for (const model of model_dict[project_name]) {
            const model_name = Array.isArray(model) ? model[0] : model;
            const child_li = get_tree_li_element(model_name, icons_class['DB_Icon']);

            if (!project) {
                child_li.onclick = function (e) {
                    e.stopPropagation();
                    const checked = child_li.firstChild.checked;
                    child_li.firstChild.checked = !checked;
                    // If any child is unchecked, parent should be unchecked
                    if (!child_li.firstChild.checked) {
                        parent.firstChild.checked = false;
                    } else {
                        // If all children checked, parent checked
                        const allChecked = Array.from(child_ul.childNodes).every(li => li.firstChild.checked);
                        parent.firstChild.checked = allChecked;
                    }
                };
            }
            child_ul.appendChild(child_li);
        }

        // Parent click toggles all children
        parent.onclick = function (e) {
            e.stopPropagation();
            const checked = parent.firstChild.checked;
            parent.firstChild.checked = !checked;
            for (const li of child_ul.childNodes) {
                li.firstChild.checked = parent.firstChild.checked;
            }
        };

        tree.appendChild(parent_li);
        tree.appendChild(child_ul);
    }
    return get_cl_element("div", "card-body scc-box", null, tree);
}

function remove_modal(del_btn) {
    const cancel_text = del_btn ? "Delete" : "Hide";
    const header_text = del_btn ? "Delete Models" : "Hide Models";
    const [modal_body, add_btn] = populate_modal(header_text, cancel_text);

    // Build model dictionary by project
    const model_dict = {};
    document.querySelectorAll("#availableModal > li").forEach(li => {
        const project = li.getAttribute("project");
        const template = li.getAttribute("template");
        const name = li.innerText;
        if (!model_dict[project]) model_dict[project] = [];
        model_dict[project].push([name, template]);
    });

    modal_body.appendChild(get_cl_tree(model_dict));

    add_btn.onclick = async function () {
        const model_list = [];
        const projects_dict = {};

        modal_body.querySelectorAll(".TreeMembers li").forEach(li => {
            if (li.parentNode.classList.contains("childList") && li.firstChild.checked) {
                const name = li.innerText;
                const project = li.parentNode.previousElementSibling.innerText;
                model_list.push(name);
                if (!projects_dict[project]) projects_dict[project] = [];
                projects_dict[project].push(name);
            }
        });

        if (Object.keys(projects_dict).length) {
            hideModal();
            await fetchData('home', 'deleteModel', { projects_dict, del_opt: del_btn });

            const modals = document.getElementById('availableModal');
            modals.querySelectorAll("li").forEach(li => {
                if (model_list.includes(li.innerText)) li.remove();
            });

            if (modals.firstChild) {
                modals.firstChild.click();
            } else {
                document.getElementById("tableGroup").innerHTML = "";
            }
            confirmBox("Success!", "Model Removed Successfully");
        } else {
            confirmBox("Alert!", "Please select at least one model");
        }
    };

    showModal();
}

function get_tree_li_element(level_name, icon_class) {
    const li = get_cl_element("li");
    // Create checkbox input
    const checkbox = get_cl_element("input", "inputcheckbox");
    checkbox.type = "checkbox";
    li.appendChild(checkbox);

    // Create label
    const label = get_cl_element("label", "checkBox-label");
    // Icon span
    const iconSpan = get_cl_element("span", `fas ${icon_class}`);
    label.appendChild(iconSpan);
    // Text node
    label.appendChild(document.createTextNode(level_name));
    li.appendChild(label);

    return li;
}


async function saveAsModel(e) {
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button");
    if (!selected_model) {
        confirmBox("Alert!", "Please select a model");
        return;
    }
    if (selected_model.getAttribute("dbtype") !== "SQLITE") {
        confirmBox("Alert!", "Method is applicable only for SQLITE type models");
        return;
    }

    const model_name = selected_model.innerText;
    const project_name = selected_model.getAttribute("project");
    const template = selected_model.getAttribute("template");
    const dbtype = selected_model.getAttribute("dbtype");

    const [modal_body, add_btn] = populate_modal("Save As", "Save");
    const form_div = get_cl_element("div", "form-group mb-4");
    form_div.appendChild(get_addModel_row('new_modelName_div', 'New Model Name', 'new_model_name', 'normal', [], '', 'fas fa-database'));
    modal_body.appendChild(form_div);

    add_btn.onclick = async function () {
        const new_model_name = document.getElementById('new_model_name').value.trim();
        if (!new_model_name || !valid_string(new_model_name)) {
            confirmBox("Alert!", "Please enter valid model name");
            return;
        }

        const model_body = document.getElementById("availableModal");
        for (const li of model_body.querySelectorAll("li")) {
            if (li.innerText.trim() === new_model_name) {
                confirmBox("Alert!", `Model already active with same name ${new_model_name}`);
                return;
            }
        }

        hideModal();

        const res = await fetchData('home', 'saveAsModel', {
            new_model_name,
            new_model_template: template,
            project_name,
            model_name
        });

        if (res.message && res.message.includes('Invalid')) {
            confirmBox('Alert', res.message);
            return;
        }

        model_body.appendChild(get_li_element([new_model_name, template, project_name, dbtype]));
        model_body.lastChild.click();
        confirmBox("Success!", "Save As Model Added");
    };

    showModal();
}

async function uplaodModel(e) {
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button");
    if (!selected_model) {
        confirmBox("Alert!", "Please select a model");
        return;
    }

    const model_name = selected_model.innerText;
    const template = selected_model.getAttribute("template");
    const [modal_body, add_btn] = populate_modal("Restore Model", "Upload");

    // File input UI
    const form_div = document.createElement("div");
    form_div.className = "flex items-center w-full border border-gray-300 rounded-md overflow-hidden bg-white";

    const input_div = document.createElement("input");
    input_div.type = "file";
    input_div.accept = ".db,.sqlite3";
    input_div.className = "hidden";
    input_div.id = "fileInput";

    const browse_btn = document.createElement("label");
    browse_btn.setAttribute("for", "fileInput");
    browse_btn.className = "cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 border-r border-gray-300 hover:bg-gray-200";
    browse_btn.innerText = "Browse...";

    const file_name = document.createElement("span");
    file_name.className = "px-3 py-2 text-gray-600 text-sm truncate flex-1";
    file_name.innerText = "No file selected.";

    input_div.addEventListener("change", () => {
        file_name.innerText = input_div.files.length > 0 ? input_div.files[0].name : "No file selected.";
    });

    form_div.appendChild(browse_btn);
    form_div.appendChild(file_name);
    form_div.appendChild(input_div);
    modal_body.appendChild(form_div);

    add_btn.onclick = async function () {
        const file = input_div.files[0];
        if (file) {
            add_btn.setAttribute("disabled", "");
            add_btn.innerHTML = `<span class="animate-spin border-2 border-t-transparent border-white rounded-full w-4 h-4 inline-block"></span>`;

            await uploadFile('home', 'uploadModel', file, { model_name });
            input_div.value = null;
            file_name.innerText = "No file selected.";
            add_btn.removeAttribute("disabled");
            add_btn.innerHTML = "Upload";
            hideModal();
            confirmBox("Success!", "Model Uploaded Successfully");
            get_model_tables(model_name, template);
        } else {
            confirmBox("Alert!", "Please choose a model");
        }
    };

    showModal();
}

async function downloadModel(e) {
    const loader = document.getElementById('data-loader');
    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
    if (!selectedModel) {
        confirmBox("Alert!", "Please select a model");
        return;
    }
    const modelName = selectedModel.innerText;
    const projectName = selectedModel.getAttribute('project');
    loader.style.display = "";
    await fetchData('home', 'downloadModel', { model_name: modelName, project_name: projectName });
    loader.style.display = "none";
}

function uploadExcelFile(e) {
    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
    if (!selectedModel) {
        confirmBox("Alert!", "Please select a model");
        return;
    }
    const modelName = selectedModel.innerText;
    const [modalBody, addBtn] = populate_modal("Upload Excel", "Upload");

    // File input UI
    const fileInputWrapper = document.createElement("div");
    fileInputWrapper.className = "flex items-center w-full border border-gray-300 rounded-md overflow-hidden bg-white";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    fileInput.className = "hidden";
    fileInput.id = "excelFileInput";

    const browseLabel = document.createElement("label");
    browseLabel.setAttribute("for", "excelFileInput");
    browseLabel.className = "cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 border-r border-gray-300 hover:bg-gray-200";
    browseLabel.innerText = "Browse...";

    const fileNameSpan = document.createElement("span");
    fileNameSpan.className = "px-3 py-2 text-gray-600 text-sm truncate flex-1";
    fileNameSpan.innerText = "No file selected.";

    fileInput.addEventListener("change", () => {
        fileNameSpan.innerText = fileInput.files.length > 0 ? fileInput.files[0].name : "No file selected.";
    });

    fileInputWrapper.appendChild(browseLabel);
    fileInputWrapper.appendChild(fileNameSpan);
    fileInputWrapper.appendChild(fileInput);
    modalBody.appendChild(fileInputWrapper);

    addBtn.onclick = async function () {
        selectedFile = fileInput.files[0];
        if (selectedFile) {
            addBtn.setAttribute("disabled", "");
            addBtn.innerHTML = `<span class="animate-spin border-2 border-t-transparent border-white rounded-full w-4 h-4 inline-block"></span>`;

            const excelInfo = await get_uploadExcel_info(modelName, [], selectedFile);
            excelUploadInfo = excelInfo;

            hideModal();
            openUploadExcelModal();

            fileInput.value = null;
            fileNameSpan.textContent = "No file selected.";
            addBtn.innerHTML = "Upload";
            addBtn.removeAttribute("disabled");
        } else {
            confirmBox("Alert!", "Please choose a file");
        }
    };
    showModal();
}

function openUploadExcelModal() {
    const modal = document.getElementById('modal-uploadExcel-info');
    const bodyEl = modal.querySelector('.modal-body');
    bodyEl.innerHTML = '';

    // Table wrapper
    const table = get_cl_element("table", "min-w-full border border-gray-300 text-sm text-left");
    const thead = get_cl_element("thead", "bg-gray-100");
    const headerRow = get_cl_element("tr");
    headerRow.appendChild(get_cl_element("th", "px-3 py-2 border border-gray-300", null, document.createTextNode("Sheet Name")));
    headerRow.appendChild(get_cl_element("th", "px-3 py-2 border border-gray-300", null, document.createTextNode("Upload Option")));
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = get_cl_element("tbody", "divide-y divide-gray-200");
    table.appendChild(tbody);

    for (const filename in excelUploadInfo) {
        const tr = get_cl_element("tr", "border-b");
        tr.appendChild(get_cl_element("td", "px-3 py-2 border border-gray-300", null, document.createTextNode(filename)));

        const select = get_cl_element("select", "w-full select");
        let options;
        if (excelUploadInfo[filename][0] === "New") {
            options = [
                { value: "ignore", text: "Ignore" },
                { value: "createAndUpload", text: "Create and Upload" }
            ];
        } else {
            options = [
                { value: "purgeAndUpload", text: "Purge and Upload" },
                { value: "createAndUpload", text: "Drop Table and Upload" },
                { value: "ignore", text: "Ignore" }
            ];
        }
        options.forEach(opt => {
            const option = document.createElement("option");
            option.value = opt.value;
            option.textContent = opt.text;
            if (
                opt.value === "ignore" &&
                excelUploadInfo[filename][1] !== "Input"
            ) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        tr.appendChild(get_cl_element("td", "px-3 py-2 text-center", null, select));
        tbody.appendChild(tr);
    }

    const formDiv = get_cl_element("div", "overflow-y-auto max-h-72 border rounded-md");
    formDiv.appendChild(table);
    bodyEl.appendChild(formDiv);

    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeUploadExcelModal() {
    const modal = document.getElementById('modal-uploadExcel-info');
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

document.getElementById('saveFileName').onclick = async function () {
    this.setAttribute("disabled", "true");
    this.innerHTML = `<span class="animate-spin border-2 border-t-transparent border-white rounded-full w-4 h-4 inline-block"></span>`;

    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
    const modelName = selectedModel.innerText;
    const template = selectedModel.getAttribute("template");

    const tbody = document.getElementById('modal-uploadExcel-info').querySelector('tbody');
    const uploadInfo = {};
    tbody.querySelectorAll('tr').forEach(tr => {
        const sheetName = tr.firstElementChild.innerText;
        const option = tr.querySelector('select').value;
        uploadInfo[sheetName] = option;
    });

    const result = await uploadExcel(modelName, Object.keys(uploadInfo), selectedFile, uploadInfo);

    closeUploadExcelModal();
    confirmBox("Success!", "Excel Uploaded Successfully");
    update_excel_log(result, uploadInfo);
    get_model_tables(modelName, template);

    this.innerText = 'Upload';
    this.removeAttribute('disabled');
}

function update_excel_log(rows, uploadInfo) {
    const [modal_body, add_btn] = populate_modal("Status", "OK");

    const form_div = get_cl_element("div", "overflow-y-auto max-h-72 border rounded-md");
    const table = get_cl_element("table", "w-full border border-gray-300 text-sm text-left");

    // Table header
    const thead = get_cl_element("thead", "bg-gray-100");
    const header_row = get_cl_element("tr");
    ["SheetName", "Status", "Msg"].forEach(text => {
        header_row.appendChild(get_cl_element("th", "px-3 py-2 border border-gray-300", null, document.createTextNode(text)));
    });
    thead.appendChild(header_row);
    table.appendChild(thead);

    // Table body
    const tbody = get_cl_element("tbody", "divide-y divide-gray-200");
    Object.keys(rows).forEach(sheetName => {
        const tr = get_cl_element("tr", "hover:bg-gray-50");
        tr.appendChild(get_cl_element("td", "px-3 py-2 border border-gray-300", null, document.createTextNode(sheetName)));

        let status = "Errored";
        let message = rows[sheetName];
        if (!isNaN(rows[sheetName])) {
            if (uploadInfo[sheetName] === "createAndUpload") {
                status = "Create And Uploaded";
                message = `${rows[sheetName]} rows inserted`;
            } else if (uploadInfo[sheetName] === "purgeAndUpload") {
                status = "Purge And Uploaded";
                message = `${rows[sheetName]} rows inserted`;
            }
        }

        tr.appendChild(get_cl_element("td", "px-3 py-2 border border-gray-300 font-medium text-blue-600", null, document.createTextNode(status)));
        tr.appendChild(get_cl_element("td", "px-3 py-2 border border-gray-300 text-gray-700", null, document.createTextNode(message)));
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    form_div.appendChild(table);
    modal_body.appendChild(form_div);

    showModal();
    add_btn.onclick = hideModal;
}

function downloadExcelFile(e) {
    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
    if (!selectedModel) {
        confirmBox("Alert!", "Please select a model");
        return;
    }

    const modelName = selectedModel.innerText;
    const tableGroups = Array.from(document.getElementById("tableGroup").querySelectorAll("button.accordion-header"))
        .map(el => el.innerText);

    const [modalBody, addBtn] = populate_modal("Download Excel", "Download");

    // Add checkboxes for each table group
    tableGroups.forEach(groupName => {
        const checkbox = get_cl_element("input", "input");
        checkbox.type = "checkbox";
        checkbox.checked = true;

        const label = get_cl_element("label", "label gap-3 mb-2");
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(groupName));
        modalBody.appendChild(label);
    });

    // Modal footer customization
    const modalFooter = scc_one_modal.querySelector(".modal-footer");
    modalFooter.innerHTML = "";

    // Include empty tables checkbox
    const emptyCheckbox = get_cl_element("input", "input", "emptyCheck");
    emptyCheckbox.type = "checkbox";
    emptyCheckbox.checked = true;

    const emptyLabel = get_cl_element("label", "label ml-2", null, document.createTextNode("Include Empty Tables"));
    emptyLabel.setAttribute("for", "emptyCheck");

    const emptyDiv = get_cl_element("div", "flex mb-4");
    emptyDiv.appendChild(emptyCheckbox);
    emptyDiv.appendChild(emptyLabel);

    // Cancel and Download buttons
    const cancelBtn = get_cl_element("button", "btn-secondary", null, document.createTextNode("Cancel"));
    cancelBtn.onclick = hideModal;

    const downloadBtn = get_cl_element("button", "btn ml-auto", null, document.createTextNode("Download"));

    const btnGroup = get_cl_element("div", "flex justify-between align-items-center");
    btnGroup.appendChild(cancelBtn);
    btnGroup.appendChild(downloadBtn);

    const footerFlex = get_cl_element("div", "w-full");
    footerFlex.appendChild(emptyDiv);
    footerFlex.appendChild(btnGroup);

    modalFooter.prepend(footerFlex);

    downloadBtn.onclick = async function () {
        const selectedGroups = Array.from(modalBody.querySelectorAll("input[type='checkbox']:checked"))
            .map(cb => cb.parentNode.innerText);

        hideModal();

        const loader = document.getElementById("dl_progress_div");
        loader.classList.remove("hidden");

        const includeEmpty = document.getElementById("emptyCheck").checked;
        await downloadExcel(modelName, [], selectedGroups, includeEmpty);

        loader.classList.add("hidden");
    };

    showModal();
}

async function vacuumModel(e) {
    const dropdown = document.getElementById('dashboard-dropdown');
    dropdown.classList.toggle('hidden');
    const loader = document.getElementById('data-loader');
    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
    if (!selectedModel) {
        confirmBox("Alert!", "Please select a model");
        return;
    }
    const modelName = selectedModel.innerText;

    loader.style.display = "";
    try {
        await executeQuery('executeQuery', modelName, 'VACUUM');
        confirmBox("Success!", "Database vacuum completed.");
    } catch (err) {
        confirmBox("Alert!", "Vacuum operation failed.");
    } finally {
        loader.style.display = "none";
    }
}


document.getElementById('model-createView').onclick = () => {
    const viewNameInput = document.getElementById("viewName");
    const queryInput = document.getElementById("query-input");
    const modal = document.getElementById('createView-modal');

    if (viewNameInput) viewNameInput.value = "";
    if (queryInput) queryInput.value = "";

    if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
    }
};

async function create_view() {
    const viewName = document.getElementById("viewName").value.trim();
    const viewQuery = document.getElementById("query-input").value.trim();
    const selectedModelEl = document.getElementById("availableModal").querySelector("li.selected-button");
    const selectedModel = selectedModelEl ? selectedModelEl.innerText : null;

    if (!selectedModel) {
        confirmBox("Alert!", "Please select a model");
        return;
    }
    if (!viewName || !viewQuery) {
        confirmBox("Alert!", "Please make sure that View Name and Query are entered");
        return;
    }

    await fetchData('home', 'checkOrCreateView', {
        view_name: viewName,
        view_query: viewQuery,
        model_name: selectedModel,
        isExist: false
    });

    document.getElementById('createView-modal').classList.add('hidden');
    document.getElementById("viewName").value = "";
    document.getElementById("query-input").value = "";
    confirmBox("Success", "View created successfully");
    get_model_tables(selectedModel, null);
}

async function uploadPackage(e) {
    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
    if (!selectedModel) {
        confirmBox("Alert!", "Please select a model");
        return;
    }

    const [modalBody, addBtn] = populate_modal("Upload Package", "Upload");
    const formDiv = document.createElement("div");
    formDiv.className = "flex items-center w-full border border-gray-300 rounded-md overflow-hidden bg-white";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".whl";
    fileInput.className = "hidden";
    fileInput.id = "fileInput";

    const browseLabel = document.createElement("label");
    browseLabel.setAttribute("for", "fileInput");
    browseLabel.className = "cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 border-r border-gray-300 hover:bg-gray-200";
    browseLabel.innerText = "Browse...";

    const fileNameSpan = document.createElement("span");
    fileNameSpan.className = "px-3 py-2 text-gray-600 text-sm truncate flex-1";
    fileNameSpan.innerText = "No file selected.";

    fileInput.addEventListener("change", () => {
        fileNameSpan.innerText = fileInput.files.length > 0 ? fileInput.files[0].name : "No file selected.";
    });

    formDiv.appendChild(browseLabel);
    formDiv.appendChild(fileNameSpan);
    formDiv.appendChild(fileInput);
    modalBody.appendChild(formDiv);

    addBtn.onclick = async function () {
        const selectedFile = fileInput.files[0];
        if (selectedFile) {
            addBtn.setAttribute("disabled", "");
            addBtn.innerHTML = `<span class="animate-spin border-2 border-t-transparent border-white rounded-full w-4 h-4 inline-block"></span>`;
            try {
                const arrayBuffer = await selectedFile.arrayBuffer();
                const query = `INSERT INTO S_PackageWheels (WheelName,WheelBlob) VALUES (?, ?) ON CONFLICT (WheelName) DO UPDATE SET WheelBlob = ?`;
                await executeQuery('insertData', selectedModel.innerText, query, [selectedFile.name, new Uint8Array(arrayBuffer), new Uint8Array(arrayBuffer)]);
                confirmBox('Success', "Package uploaded successfully!");
            } catch (err) {
                console.error("Error saving file:", err);
            }
            hideModal();
            fileInput.value = null;
            addBtn.innerHTML = "Upload";
            addBtn.removeAttribute("disabled");
        } else {
            confirmBox("Alert!", "Please choose a file");
        }
    };

    showModal();
}

async function saveFiles() {
    const btn = this;
    btn.setAttribute("disabled", "");
    btn.innerHTML = `<span class="animate-spin border-2 border-t-transparent border-white rounded-full w-4 h-4 inline-block"></span>`;

    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
    const inputEl = document.getElementById('inpFiles');

    if (inputEl.files.length > 0) {
        // Remove all files from S_DataFiles
        await executeQuery('executeQuery', selectedModel.innerText, `DELETE FROM S_DataFiles;`, ['script']);

        // Upload each selected file
        for (const file of inputEl.files) {
            const buffer = await file.arrayBuffer();
            const query = `INSERT INTO S_DataFiles (FileName,FileType,FileBlob) VALUES (?, ?, ?) ON CONFLICT (FileName,FileType) DO UPDATE SET FileBlob = ?`;
            await executeQuery('insertData', selectedModel.innerText, query, [file.name, 'Input', new Uint8Array(buffer), new Uint8Array(buffer)]);
        }

        btn.removeAttribute("disabled");
        btn.innerHTML = "Upload";
        document.getElementById('modal-upload-files').classList.add('hidden');
        confirmBox('Success', 'Files Upload Successfully.');
    }

    inputEl.value = null;
}

async function populateInputFiles() {
    const modal = document.getElementById('modal-input-files');
    const bodyEl = modal.querySelector('.modal-body');
    bodyEl.innerHTML = '';

    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
    const query = `SELECT FileId,FileName FROM S_DataFiles WHERE FileType = 'Input'`;
    const files = await executeQuery('fetchData', selectedModel.innerText, query);

    // Table setup
    const table = get_cl_element("table", "w-full text-sm text-left");
    const thead = get_cl_element("thead", "bg-gray-100");
    const headerRow = get_cl_element("tr");
    ["File Name", "", "", ""].forEach(text => {
        headerRow.appendChild(get_cl_element("th", "p-2 border border-gray-300", null, document.createTextNode(text)));
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = get_cl_element("tbody");
    table.appendChild(tbody);

    for (const [fileId, fileName] of files) {
        const tr = get_cl_element("tr");

        // File name cell
        tr.appendChild(get_cl_element("td", "w-full p-2 border border-gray-300", null, document.createTextNode(fileName)));

        // Delete button
        const delTd = get_cl_element("td", "px-3 py-2 border border-gray-300 text-gray-700");
        const delBtn = get_cl_element('span', 'fa fa-trash');
        delBtn.onclick = () => delInputFile(fileName, fileId);
        delTd.appendChild(delBtn);
        tr.appendChild(delTd);

        // Upload button
        const uploadTd = get_cl_element("td", "px-3 py-2 border border-gray-300 text-gray-700");
        const uploadBtn = get_cl_element('span', 'fa fa-upload');
        uploadBtn.onclick = () => uploadInputFile(fileName, fileId);
        uploadTd.appendChild(uploadBtn);
        tr.appendChild(uploadTd);

        // Download button
        const downloadTd = get_cl_element("td", "px-3 py-2 border border-gray-300 text-gray-700");
        const downloadBtn = get_cl_element('span', 'fa fa-download');
        downloadBtn.onclick = () => downloadInputFile(fileName, fileId);
        downloadTd.appendChild(downloadBtn);
        tr.appendChild(downloadTd);

        tbody.appendChild(tr);
    }

    const formDiv = get_cl_element("div", "overflow-y-auto max-h-72 mb-4");
    formDiv.style.maxHeight = "300px";
    formDiv.style.overflowY = "auto";
    formDiv.appendChild(table);
    bodyEl.appendChild(formDiv);

    // Add File button
    const btnDiv = get_cl_element('div', 'flex justify-end');
    const addBtn = get_cl_element('button', 'btn btn-primary', null, document.createTextNode('Add File'));
    addBtn.onclick = () => uploadInputFile();
    btnDiv.appendChild(addBtn);
    bodyEl.appendChild(btnDiv);
}

async function delInputFile(fileName, fileId) {
    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
    const query = `DELETE FROM S_DataFiles WHERE FileType = 'Input' AND FileId = ? AND FileName = ?`;
    await executeQuery('deleteData', selectedModel.innerText, query, [fileId, fileName]);
    await populateInputFiles();
}

async function downloadInputFile(fileName, fileId) {
    const modalHeader = document.getElementById('modal-input-files').querySelector('h2').innerText;
    const fileType = modalHeader.includes('Input') ? 'Input' : 'Output';
    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
    const query = `SELECT FileName,FileBlob FROM S_DataFiles WHERE FileType = ? AND FileId = ? AND FileName = ?`;
    const result = await executeQuery('fetchData', selectedModel.innerText, query, [fileType, fileId, fileName]);

    if (result && result.length > 0) {
        const blob = new Blob([result[0][1]]);
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob);
        } else {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        }
    } else {
        confirmBox('Alert!', 'No File Exists');
    }
}

async function uploadInputFile(fileName = null, fileId = null) {
    document.getElementById('modal-input-files').classList.add('hidden');
    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");

    const [modalBody, addBtn] = populate_modal("Upload File", "Upload");
    const formDiv = document.createElement("div");
    formDiv.className = "flex items-center w-full border border-gray-300 rounded-md overflow-hidden bg-white";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.className = "hidden";
    fileInput.id = "fileInput";

    const browseLabel = document.createElement("label");
    browseLabel.setAttribute("for", "fileInput");
    browseLabel.className = "cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 border-r border-gray-300 hover:bg-gray-200";
    browseLabel.innerText = "Browse...";

    const fileNameSpan = document.createElement("span");
    fileNameSpan.className = "px-3 py-2 text-gray-600 text-sm truncate flex-1";
    fileNameSpan.innerText = "No file selected.";

    fileInput.addEventListener("change", () => {
        fileNameSpan.innerText = fileInput.files.length > 0 ? fileInput.files[0].name : "No file selected.";
    });

    formDiv.appendChild(browseLabel);
    formDiv.appendChild(fileNameSpan);
    formDiv.appendChild(fileInput);
    modalBody.appendChild(formDiv);

    addBtn.onclick = async function () {
        const file = fileInput.files[0];
        if (file) {
            addBtn.setAttribute("disabled", "");
            addBtn.innerHTML = `<span class="animate-spin border-2 border-t-transparent border-white rounded-full w-4 h-4 inline-block"></span>`;

            const buffer = await file.arrayBuffer();
            if (fileName && fileId) {
                const query = `UPDATE S_DataFiles SET FileBlob = ? WHERE FileType = 'Input' AND FileName = ? AND FileId = ?`;
                await executeQuery('updateData', selectedModel.innerText, query, [new Uint8Array(buffer), fileName, fileId]);
            } else {
                const query = `INSERT INTO S_DataFiles (FileName,FileType,FileBlob) VALUES (?, ?, ?) ON CONFLICT (FileName,FileType) DO UPDATE SET FileBlob = ?`;
                await executeQuery('insertData', selectedModel.innerText, query, [file.name, 'Input', new Uint8Array(buffer), new Uint8Array(buffer)]);
            }

            hideModal();
            const inputFileModal = document.getElementById('modal-input-files');
            inputFileModal.classList.remove("hidden", "opacity-0");
            inputFileModal.classList.add("flex");
            fileInput.value = null;
            addBtn.innerHTML = "Upload";
            addBtn.removeAttribute("disabled");
            await populateInputFiles();
        } else {
            confirmBox("Alert!", "Please choose a file");
        }
    };
    showModal();
}

async function populateOutputFiles() {
    const modal = document.getElementById('modal-input-files');
    const bodyEl = modal.querySelector('.modal-body');
    bodyEl.innerHTML = '';

    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
    const query = `SELECT FileId,FileName FROM S_DataFiles WHERE FileType = 'Output'`;
    const files = await executeQuery('fetchData', selectedModel.innerText, query);

    // Table setup
    const table = get_cl_element("table", "w-full text-sm text-left");
    const thead = get_cl_element("thead", "bg-gray-100");
    const headerRow = get_cl_element("tr");
    ["File Name", ""].forEach(text => {
        headerRow.appendChild(get_cl_element("th", "p-2 border border-gray-300", null, document.createTextNode(text)));
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = get_cl_element("tbody");
    table.appendChild(tbody);

    for (const [fileId, fileName] of files) {
        const tr = get_cl_element("tr");

        // File name cell
        tr.appendChild(get_cl_element("td", "w-full p-2 border border-gray-300", null, document.createTextNode(fileName)));

        // Download button
        const downloadTd = get_cl_element("td", "px-3 py-2 border border-gray-300 text-gray-700");
        const downloadBtn = get_cl_element('span', 'fa fa-download');
        downloadBtn.onclick = () => downloadInputFile(fileName, fileId);
        downloadTd.appendChild(downloadBtn);
        tr.appendChild(downloadTd);

        tbody.appendChild(tr);
    }

    const formDiv = get_cl_element("div", "overflow-y-auto max-h-72 mb-4");
    formDiv.style.maxHeight = "300px";
    formDiv.style.overflowY = "auto";
    formDiv.appendChild(table);
    bodyEl.appendChild(formDiv);
}


async function populateExecutableFiles(modelName) {
    const fileDiv = document.getElementById('taskDiv');
    fileDiv.innerHTML = "";

    const query = `SELECT TaskId,TaskName,TaskDisplayName,TaskType FROM S_TaskMaster`;
    const files = await executeQuery('fetchData', modelName, query);

    for (const [TaskId, TaskName, TaskDisplayName, TaskTypeOrig] of files) {
        let TaskType = TaskTypeOrig; // preserve original for later use

        // Create list item
        const li = get_cl_element('li', 'flex', null);

        // Display name link
        const a = get_cl_element('a',
            'w-full px-4 py-2 text-sm text-card-foreground hover:bg-muted hover:text-muted-foreground transition-colors cursor-pointer',
            null,
            document.createTextNode(TaskDisplayName)
        );

        // Edit button
        const btnEdit = get_cl_element('button', 'btn-outline btn-sm edit-btn mr-1 px-1', null,
            get_cl_element('span', 'fa-solid fa-pencil')
        );
        btnEdit.title = 'Edit Task';

        // Delete button
        const btnDel = get_cl_element('button', 'btn-outline btn-sm del-btn mr-1 px-1', null,
            get_cl_element('span', 'fa-solid fa-trash-alt')
        );
        btnDel.title = 'Delete Task';

        li.appendChild(a);
        li.appendChild(btnEdit);
        li.appendChild(btnDel);

        btnEdit.onclick = async (e) => {
            e.stopPropagation();
            const scriptNameEl = document.getElementById("upScName");
            scriptNameEl.innerHTML = "";

            const selQuery = `SELECT TaskDisplayName, TaskType, TaskName, TaskId FROM S_TaskMaster WHERE TaskDisplayName = ?`;
            const result = await executeQuery('fetchData', modelName, selQuery, [TaskDisplayName]);
            tsk_id = result[0][3];

            let tsktype = result[0][1];
            if (tsktype === 'PythonScript') tsktype = 'PScript';
            else if (tsktype === 'PythonNotebook') tsktype = 'Python';
            else if (tsktype === 'RNotebook') tsktype = 'R';
            else if (tsktype === 'JSNotebook') tsktype = 'Javascript';

            if (result && result.length > 0) {
                document.getElementById('upDsName').value = result[0][0];
                document.getElementById('upScType').value = tsktype;

                let query, res;
                if (tsktype === 'PScript') {
                    query = `SELECT FileName FROM S_ExecutionFiles WHERE FileName IS NOT NULL AND FileName LIKE '%.py' AND FilePath NOT LIKE '%/%' AND Status = ?`;
                    res = await executeQuery('fetchData', modelName, query, ['Active']);
                } else {
                    query = `SELECT Name FROM S_Notebooks WHERE Status = ? AND Type = ?`;
                    res = await executeQuery('fetchData', modelName, query, ['Active', tsktype]);
                }

                for (const ntNm of res) {
                    const opt = get_cl_element('option', null, null, document.createTextNode(ntNm));
                    opt.setAttribute('value', ntNm);
                    scriptNameEl.appendChild(opt);
                }

                document.getElementById('upScName').value = result[0][2];

                const updateScriptModal = document.getElementById('modal-updateScript');
                updateScriptModal.classList.remove('hidden');
                updateScriptModal.classList.add('flex');
            }
        };

        btnDel.onclick = async (e) => {
            e.stopPropagation();
            confirmBox('Alert!', `Are you sure you want to delete ${TaskDisplayName}?`, async function () {
                let taskType = TaskType;
                if (taskType === 'JavascriptNotebook') taskType = 'JSNotebook';
                const delQuery = "DELETE FROM S_TaskMaster WHERE TaskId = ? AND TaskType = ? AND TaskName = ?";
                await executeQuery("deleteData", modelName, delQuery, [TaskId, taskType, TaskName]);
                confirmBox('Success', 'Script Deleted Successfully');
                populateExecutableFiles(modelName);
            }, 1, 'Yes', 'No');
        };

        li.onclick = async function () {
            const dropdown = document.getElementById('runs-dropdown');
            dropdown.classList.toggle('hidden');
            const canvas = document.getElementById('myCanvas');
            const showOutput = document.getElementById('modal-show-output');
            if (canvas.style.display === "none") canvas.style.display = "";
            document.getElementById("loadingOverlay").classList.remove("hidden");
            document.getElementById("outputDiv").classList.remove("hidden");
            document.getElementById('outputTxt').innerHTML = "";
            document.getElementById('downloadOutput').removeAttribute("disabled");

            const cellBottom = document.getElementById('currCell').querySelector('.cell-bottom');
            if (cellBottom && cellBottom.innerHTML.trim() !== "") cellBottom.innerHTML = "";

            imgBlob = null;

            const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
            const projName = selectedModel.getAttribute('project');

            let execFiles, filesQuery;
            let runTaskType = TaskType;
            if (runTaskType === 'PythonScript') {
                filesQuery = `SELECT FilePath,FileData,FileName FROM S_ExecutionFiles WHERE FileName IS NOT NULL AND Status = 'Active'`;
                execFiles = await executeQuery("fetchData", selectedModel.innerText, filesQuery);
            } else {
                if (runTaskType === 'JSNotebook') {
                    runTaskType = 'JavascriptNotebook';
                    window.loadCDNScripts = async function (libraries) {
                        const loadScript = (url, globalVar) => new Promise((resolve, reject) => {
                            if (globalVar && window[globalVar]) return resolve(window[globalVar]);
                            const script = document.createElement("script");
                            script.src = url;
                            script.async = true;
                            script.onload = () => resolve(window[globalVar] || true);
                            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
                            document.head.appendChild(script);
                        });
                        return Promise.all(libraries.map(lib => loadScript(lib.url, lib.globalVar)));
                    };
                    window.loadCDNStylesheets = async function (stylesheets) {
                        return Promise.all(stylesheets.map(({ url }) => new Promise((resolve, reject) => {
                            const link = document.createElement("link");
                            link.rel = "stylesheet";
                            link.href = url;
                            link.onload = () => resolve(url);
                            link.onerror = () => reject(`Failed to load CSS: ${url}`);
                            document.head.appendChild(link);
                        })));
                    };
                    window.getData = async (query, params = []) => executeQuery('getData', modelName, query, params);
                    window.executeQuery = async (query, params = []) => executeQuery('updateData', modelName, query, params);
                }

                filesQuery = `SELECT Name,CellContent,Name FROM S_NotebookContent WHERE Name = ? AND CellType = ?`;
                const fileCont = await executeQuery('fetchData', selectedModel.innerText, filesQuery, [TaskName, runTaskType.replace("Notebook", "").toLowerCase()]);
                let mergedContent = fileCont.map(file => file[1]);
                execFiles = [[fileCont[0][0], mergedContent, fileCont[0][0]]];
            }

            let fileContent = null, fileName = '';
            execFiles.forEach(rw => {
                if (rw[0] === TaskName) {
                    fileContent = rw[1];
                    fileName = rw[2];
                }
            });

            const blobQuery = `SELECT FileName,FileBlob FROM S_DataFiles WHERE FileType = 'Input'`;
            const blobFiles = await executeQuery("fetchData", selectedModel.innerText, blobQuery);

            const wheelQuery = `SELECT WheelName,WheelBlob FROM S_PackageWheels`;
            const wheelFiles = await executeQuery("fetchData", selectedModel.innerText, wheelQuery);

            const updateQuery = `UPDATE S_Taskmaster SET TaskLastRunDate = ? WHERE TaskId = ?`;
            await executeQuery('updateData', selectedModel.innerText, updateQuery, [get_current_datetime(), TaskId]);

            const task_id = await update_task(TaskName, 'Started', null, null, TaskId);

            let res;
            if (runTaskType === 'PythonScript') {
                let value = '';
                for (const content of fileContent) value += content;
                res = await executePython('execute', 'editor', value, projName, selectedModel.innerText, execFiles, fileName, blobFiles, wheelFiles);
            } else if (runTaskType === 'PythonNotebook') {
                for (const content of fileContent) {
                    res = await executePython('execute', 'notebook', content, projName, selectedModel.innerText, execFiles, null, blobFiles, wheelFiles, 'currCell');
                }
            } else if (runTaskType === 'JavascriptNotebook') {
                for (const content of fileContent) {
                    res = await executeJavascript('currCell', content);
                }
            } else if (runTaskType === 'RNotebook') {
                for (const content of fileContent) {
                    res = await executeR('currCell', content, selectedModel.innerText, blobFiles);
                }
            }

            if (res.stderr) {
                update_task(TaskName, 'Errored', res.stderr, task_id);
            } else {
                if (res.blob) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    imgBlob = res.blob;
                    const imageBitmap = await createImageBitmap(res.blob);
                    const scale = Math.min(canvas.width / imageBitmap.width, canvas.height / imageBitmap.height);
                    const x = (canvas.width - imageBitmap.width * scale) / 2;
                    const y = (canvas.height - imageBitmap.height * scale) / 2;
                    ctx.drawImage(imageBitmap, x, y, imageBitmap.width * scale, imageBitmap.height * scale);
                    showOutput.classList.remove('hidden');
                    showOutput.classList.add('flex');
                }
                update_task(TaskName, 'Completed', null, task_id);

                if (res.outputFiles && res.outputFiles.length > 0) {
                    const delQuery = `DELETE FROM S_DataFiles WHERE FileType = 'Output'`;
                    await executeQuery('deleteData', selectedModel.innerText, delQuery);

                    for (const [filename, fileBlob] of res.outputFiles) {
                        const insQuery = `INSERT INTO S_DataFiles (FileName,FileType,FileBlob) VALUES (?, ?, ?) ON CONFLICT (FileName,FileType) DO UPDATE SET FileBlob = ?`;
                        await executeQuery('insertData', selectedModel.innerText, insQuery, [filename, 'Output', fileBlob, fileBlob]);
                    }
                }
            }

            if (res.success && runTaskType !== 'PythonScript') {
                showOutput.classList.remove('hidden');
                showOutput.classList.add('flex');
                canvas.style.display = "none";
                document.getElementById('downloadOutput').setAttribute("disabled", "true");
            }
            document.getElementById("loadingOverlay").classList.add("hidden");
            displayOutput(res.stderr);
        };

        fileDiv.appendChild(li);
    }
}

// Script type change handler
document.getElementById("scType").onchange = async function () {
    const scriptType = this.value;
    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
    const scriptNameEl = document.getElementById("scName");
    scriptNameEl.innerHTML = "";
    if (!selectedModel) {
        confirmBox("Alert!", "Please select a model");
        return;
    }
    let query, result;
    if (scriptType === 'PScript') {
        query = `SELECT FileName FROM S_ExecutionFiles WHERE FileName IS NOT NULL AND FileName LIKE '%.py' AND FilePath NOT LIKE '%/%' AND Status = ?`;
        result = await executeQuery('fetchData', selectedModel.innerText, query, ['Active']);
    } else {
        query = `SELECT Name FROM S_Notebooks WHERE Status = ? AND Type = ?`;
        result = await executeQuery('fetchData', selectedModel.innerText, query, ['Active', scriptType]);
    }
    for (const name of result) {
        const opt = get_cl_element('option', null, null, document.createTextNode(name));
        opt.value = name;
        scriptNameEl.appendChild(opt);
    }
};

// Add script modal OK handler
document.getElementById("ok-script").onclick = async function () {
    const displayName = document.getElementById("dsName").value.trim();
    const scriptType = document.getElementById("scType").value;
    const scriptName = document.getElementById("scName").value;
    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
    if (!displayName) {
        confirmBox("Alert!", "Please Enter a display name");
        return;
    }
    if (scriptType === '0') {
        confirmBox("Alert!", "Please select a script language");
        return;
    }
    if (scriptName === '0') {
        confirmBox("Alert!", "Please select a notebook");
        return;
    }
    let taskType;
    if (scriptType === 'Python') taskType = 'PythonNotebook';
    else if (scriptType === 'R') taskType = 'RNotebook';
    else if (scriptType === 'Javascript') taskType = 'JSNotebook';
    else if (scriptType === 'PScript') taskType = 'PythonScript';

    const disQuery = `SELECT TaskDisplayName FROM S_TaskMaster WHERE TaskDisplayName = ?`;
    const disExists = await executeQuery('fetchData', selectedModel.innerText, disQuery, [displayName]);
    if (disExists.length > 0) {
        confirmBox("Alert!", "Display name already exists");
        return;
    }
    const selQuery = `SELECT TaskName, TaskDisplayName FROM S_TaskMaster WHERE TaskName = ? AND TaskType = ?`;
    const taskExists = await executeQuery('fetchData', selectedModel.innerText, selQuery, [scriptName, taskType]);
    if (taskExists.length > 0) {
        confirmBox("Alert!", "Script with this name already exists");
        return;
    }
    const insQuery = `INSERT INTO S_TaskMaster (TaskName,TaskDisplayName,TaskType) VALUES (?, ?, ?)`;
    await executeQuery('insertData', selectedModel.innerText, insQuery, [scriptName, displayName, taskType]);
    await populateExecutableFiles(selectedModel.innerText);
    document.getElementById("modal-addScript").classList.add("hidden");
    document.getElementById("dsName").value = '';
    document.getElementById("scType").value = '0';
    document.getElementById("scName").innerHTML = '';
    confirmBox("Success", "Script created successfully.");
};

// Download output image
async function downloadOutput() {
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(imgBlob);
    link.download = "output.jpg";
    link.click();
    setTimeout(() => window.URL.revokeObjectURL(link.href), 1000);
}

// Get current datetime string
function get_current_datetime() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

// Update task log
async function update_task(taskName, taskStatus, msg = null, assignedTaskId = null, taskId = null) {
    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
    if (!assignedTaskId) {
        const query = `INSERT INTO T_TaskLogs (TaskId,TaskName,TaskStatus,EndDate) VALUES (?, ?, ?, datetime('now', 'localtime'))`;
        return await executeQuery('insertData', selectedModel.innerText, query, [taskId, taskName, taskStatus]);
    } else {
        const query = `UPDATE T_TaskLogs SET TaskStatus = ?,ErrorMsg = ?, EndDate = datetime('now', 'localtime') WHERE TaskName = ? AND Id = ?`;
        await executeQuery('updateData', selectedModel.innerText, query, [taskStatus, msg, taskName, assignedTaskId]);
    }
}

// Display output error
function displayOutput(stderr) {
    const outputContainer = document.getElementById('outputTxt');
    if (stderr) {
        const errorDiv = document.createElement('div');
        errorDiv.textContent = `Error: ${stderr}`;
        errorDiv.style.color = 'red';
        outputContainer.appendChild(errorDiv);
    }
}

document.getElementById("upScType").onchange = async function(){
    const scriptType = document.getElementById("upScType").value
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    const scriptName = document.getElementById("upScName")
    scriptName.innerHTML = ""
    if (!selected_model){
        confirmBox("Alert!","Please select a model")
        return;
    }
    let query
    let result
    if(scriptType === 'PScript'){
        query = `SELECT FileName FROM S_ExecutionFiles WHERE FileName IS NOT NULL AND FileName LIKE '%.py' AND FilePath NOT LIKE '%/%' AND Status = ?`;
        result = await executeQuery('fetchData',selected_model.innerText, query, ['Active']);
    }else{
        query = `SELECT Name FROM S_Notebooks WHERE Status = ? AND Type = ?`;
        result = await executeQuery('fetchData',selected_model.innerText, query, ['Active', scriptType]);
    }
    
    for (const ntNm of result){
        const li_el  = get_cl_element('option',null,null,document.createTextNode(ntNm))
        li_el.setAttribute('value',ntNm)
        scriptName.appendChild(li_el)
    }
    
}

// Update script modal OK handler
document.getElementById("update-script").onclick = async function () {
    const displayName = document.getElementById("upDsName").value.trim();
    const scriptType = document.getElementById("upScType").value;
    const scriptName = document.getElementById("upScName").value;
    const selectedModel = document.getElementById("availableModal").querySelector("li.selected-button");
    if (!displayName) {
        confirmBox("Alert!", "Please Enter a display name");
        return;
    }
    if (scriptType === '0') {
        confirmBox("Alert!", "Please select a script language");
        return;
    }
    if (scriptName === '0') {
        confirmBox("Alert!", "Please select a notebook");
        return;
    }
    let taskType;
    if (scriptType === 'Python') taskType = 'PythonNotebook';
    else if (scriptType === 'R') taskType = 'RNotebook';
    else if (scriptType === 'Javascript') taskType = 'JSNotebook';
    else if (scriptType === 'PScript') taskType = 'PythonScript';

    const disQuery = `SELECT TaskDisplayName FROM S_TaskMaster WHERE TaskDisplayName = ? AND TaskId != ?`;
    const disExists = await executeQuery('fetchData', selectedModel.innerText, disQuery, [displayName, tsk_id]);
    if (disExists.length > 0) {
        confirmBox("Alert!", "Display name already exists");
        return;
    }
    const selQuery = `SELECT TaskName, TaskDisplayName FROM S_TaskMaster WHERE TaskName = ? AND TaskType = ? AND TaskId != ?`;
    const taskExists = await executeQuery('fetchData', selectedModel.innerText, selQuery, [scriptName, taskType, tsk_id]);
    if (taskExists.length > 0) {
        confirmBox("Alert!", "Script with this name already exists");
        return;
    }
    const updQuery = `UPDATE S_TaskMaster SET TaskName = ?, TaskDisplayName = ?,TaskType = ? WHERE TaskId = ?`;
    await executeQuery('updateData', selectedModel.innerText, updQuery, [scriptName, displayName, taskType, tsk_id]);
    await populateExecutableFiles(selectedModel.innerText);
    document.getElementById("modal-updateScript").classList.add('hidden');
    document.getElementById("upDsName").value = '';
    document.getElementById("upScType").value = '0';
    document.getElementById("upScName").innerHTML = '';
    confirmBox("Success", "Script updated successfully.");
}

function updateCloseButtonPosition() {
    const outputTxt = document.getElementById("outputTxt");
    const closeBtn = document.getElementById("closeOutput");

    if (outputTxt.scrollHeight > outputTxt.clientHeight) {
        closeBtn.style.right = "20px";
    } else {
        closeBtn.style.right = "4px";
    }
}


updateCloseButtonPosition();
window.addEventListener('resize', updateCloseButtonPosition);
const observer = new MutationObserver(updateCloseButtonPosition);
observer.observe(document.getElementById("outputTxt"), { childList: true, subtree: true });


document.getElementById("pyNotebook").onclick = function(){
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    if (!selected_model){
        confirmBox("Alert!","Please select a model")
        return
    }
    const modelName = selected_model.innerText
    window.open(`./PyNotebook.html?modelName=${modelName}`);
}

document.getElementById("notebookJS").onclick = function(){
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    if (!selected_model){
        confirmBox("Alert!","Please select a model")
        return
    }
    const modelName = selected_model.innerText
    window.open(`./JsNotebook.html?modelName=${modelName}`);
}

document.getElementById("sqlEditor").onclick = function(){
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    if (!selected_model){
        confirmBox("Alert!","Please select a model")
        return
    }
    const modelName = selected_model.innerText
    window.open(`./SQLiteStudio/playground/client.html?modelName=${modelName}`);
}

document.getElementById("querySheet").onclick = function(){
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    if (!selected_model){
        confirmBox("Alert!","Please select a model")
        return
    }
    const modelName = selected_model.innerText
    window.open(`./Queries.html?modelName=${modelName}`);
}

async function fetchFilesAndDownloadZip() {
    let fileType = document.getElementById('modal-input-files').querySelector('h2').innerText.indexOf('Input') > -1?'Input':'Output'
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    try {
      let query = `SELECT FileName,FileBlob FROM S_DataFiles WHERE FileType = ?`
      const files = await executeQuery('fetchData',selected_model.innerText,query,[fileType])
      
      if (!files || files.length === 0) {
        confirmBox('Alert!',"No files found to download.")
        return;
      }
  
      const zip = new JSZip();
  
      files.forEach(file => {
        zip.file(file[0], file[1]);
      });
  
      const zipBlob = await zip.generateAsync({ type: "blob" });
  
      const downloadLink = document.createElement("a");
      downloadLink.href = window.URL.createObjectURL(zipBlob);
      downloadLink.download = "InputFiles.zip";
      downloadLink.click();
  
      setTimeout(function () {
        // For Firefox it is necessary to delay revoking the ObjectURL
        window.URL.revokeObjectURL(downloadLink.href);
      }, 1000);
  
    } catch (error) {
      console.error("Error creating zip file for download:", error);
    }
}