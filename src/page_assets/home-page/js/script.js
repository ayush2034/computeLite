import { postData,get_cl_element,confirmBox,executeQuery, fetchData, uploadFile,executePython,executeJavascript,executeR,addDefaultModel,fetchSchema } from "../../../assets/js/scc"
import {uploadExcel,downloadExcel,get_uploadExcel_info} from "../../../core/gridMethods"
const scc_one_modal = document.getElementById("scc-one-modal")

let selected = []
let excelUploadInfo = {}
let selectedFile = null
let imgBlob = null
const current_version = "1.0.0"
const params = new URLSearchParams(window.location.search)
let schema = {}
const modelUID = params.get('modelUID');
const icons_class = {'DB_Icon': 'fas fa-database'}
let tsk_id

// Mobile menu toggle
document.getElementById('mobile-menu-button').addEventListener('click', function() {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
});

// Model dropdown toggle
document.getElementById('models-menu-button').addEventListener('click', function() {
    const dropdown = document.getElementById('dashboard-dropdown');
    dropdown.classList.toggle('hidden');
});

// Files dropdown toggle
document.getElementById('files-menu-button').addEventListener('click', function() {
    const dropdown = document.getElementById('files-dropdown');
    dropdown.classList.toggle('hidden');
});

// RUN dropdown toggle
document.getElementById('run-menu-button').addEventListener('click', function() {
    const dropdown = document.getElementById('runs-dropdown');
    dropdown.classList.toggle('hidden');
});

// Notebook dropdown toggle
document.getElementById('notebook-menu-button').addEventListener('click', function() {
    const dropdown = document.getElementById('notebook-dropdown');
    dropdown.classList.toggle('hidden');
});

// Mobile Dashboard dropdown toggle
document.getElementById('mobile-dashboard-button').addEventListener('click', function() {
    const dropdown = document.getElementById('mobile-dashboard-dropdown');
    dropdown.classList.toggle('hidden');
});

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    const dashboardButton = document.getElementById('models-menu-button');
    const dashboardDropdown = document.getElementById('dashboard-dropdown');
    const filesButton = document.getElementById('files-menu-button');
    const filesDropdown = document.getElementById('files-dropdown');
    const runsButton = document.getElementById('run-menu-button');
    const runsDropdown = document.getElementById('runs-dropdown');
    const notebookButton = document.getElementById('notebook-menu-button');
    const notebookDropdown = document.getElementById('notebook-dropdown');
    const mobileDashboardButton = document.getElementById('mobile-dashboard-button');
    const mobileDashboardDropdown = document.getElementById('mobile-dashboard-dropdown');

    // Close desktop dropdown if clicked outside
    if (!dashboardButton.contains(event.target) && !dashboardDropdown.contains(event.target)) {
        dashboardDropdown.classList.add('hidden');
    }

    // Close files dropdown if clicked outside
    if (!filesButton.contains(event.target) && !filesDropdown.contains(event.target)) {
        filesDropdown.classList.add('hidden');
    }

    // Close run dropdown if clicked outside
    if (!runsButton.contains(event.target) && !runsDropdown.contains(event.target)) {
        runsDropdown.classList.add('hidden');
    }

    // Close notebook dropdown if clicked outside
    if (!notebookButton.contains(event.target) && !notebookDropdown.contains(event.target)) {
        notebookDropdown.classList.add('hidden');
    }

    // Close mobile dropdown if clicked outside
    if (!mobileDashboardButton.contains(event.target) && !mobileDashboardDropdown.contains(event.target)) {
        mobileDashboardDropdown.classList.add('hidden');
    }
});

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

    setTimeout(get_user_models, 400);

    const shareBtn = document.getElementById('shareBtn');
    shareBtn.classList.add('blink');
    
   
    // const modalElements = document.querySelectorAll('.modal');
    // modalElements.forEach(modalElement => {
    //     if (!bootstrap.Modal.getInstance(modalElement)) {
    //     new bootstrap.Modal(modalElement);
    //     }
    // });
    

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

    // const modelButtons = document.querySelectorAll('#modelList button');
    
    // modelButtons.forEach(button => {
    //     button.addEventListener('click', function() {
    //         // Remove selected state from all buttons
    //         modelButtons.forEach(btn => {
    //             btn.className = 'deselected-button';
    //         });
            
    //         // Add selected state to clicked button
    //         this.className = 'selected-button';
    //     });
    // });

    document.getElementById("ok-view").onclick = create_view;
    document.getElementById("deleteModel").onclick = remove_modal.bind(null,true)
    document.getElementById("removeModel").onclick = remove_modal.bind(null,false)
    document.getElementById("addNew").onclick = get_newModel_modal.bind(null,"Add New Model",false)
    // document.getElementById('downloadAllFiles').onclick = fetchFilesAndDownloadZip
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

// Model selection functionality
// document.addEventListener('DOMContentLoaded', async function() {
//     const modelButtons = document.querySelectorAll('#modelList button');
    
//     modelButtons.forEach(button => {
//         button.addEventListener('click', function() {
//             // Remove selected state from all buttons
//             modelButtons.forEach(btn => {
//                 btn.className = 'deselected-button';
//             });
            
//             // Add selected state to clicked button
//             this.className = 'selected-button';
//         });
//     });

//     document.getElementById("addNew").onclick = get_newModel_modal.bind(null,"Add New Model",false)
// });



// document.getElementById('addNew').onclick = function() {
//     scc_one_modal.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
//     scc_one_modal.classList.add('flex');
// }

// document.getElementById('closeModal').onclick = function () {
//     scc_one_modal.classList.remove('flex');
//     scc_one_modal.classList.add('hidden');
// }

// // Optional: close when clicking outside modal box
// scc_one_modal.addEventListener('click', (e) => {
//     if (e.target === scc_one_modal){
//         scc_one_modal.classList.remove('flex');
//         scc_one_modal.classList.add('hidden');  
//     }
// });

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
  const modal_header = scc_one_modal.querySelector('.flex h2')
  modal_header.innerText = header_name

  const modal_body = scc_one_modal.querySelector(".modal-body")
  modal_body.innerHTML = ""

  const modal_footer = scc_one_modal.querySelector(".modal-footer")
  modal_footer.innerHTML = ""

  // Cancel Button
  const cancel_button = get_cl_element("button",
    "btn-secondary",
    null,
    document.createTextNode("Cancel"))
  cancel_button.onclick = hideModal

  // Add Button
  const add_btn = get_cl_element("button",
    "btn ml-auto",
    null,
    document.createTextNode(btn_text))

  modal_footer.appendChild(cancel_button)
  modal_footer.appendChild(add_btn)

  return [modal_body, add_btn]
}


function get_newModel_modal(header, anotherModal = false) {
  const [modal_body, add_btn] = populate_modal(header, "Add")
  const form_div = get_cl_element("div", "space-y-4")

  form_div.appendChild(
    get_addModel_row('name_div', 'Model Name', 'db_name', 'normal', [], '', "fas fa-database")
  )

  if (anotherModal) {
    form_div.appendChild(
      get_addModel_row('path_div', 'Model Path', 'db_path', 'normal')
    )
  } else {
    form_div.appendChild(
      get_addModel_row('template_div', 'Model Template', 'model_template', 'select', Object.keys(schema))
    )
  }

  modal_body.appendChild(form_div)

  add_btn.onclick = async function () {
    const model_name = document.getElementById('db_name').value
    if (model_name.trim() == "" || !valid_string(model_name)) {
      confirmBox("","Please enter valid model name")
      return
    }

    for (let cn of document.getElementById("availableModal").querySelectorAll("li")) {
      if (model_name.trim() == cn.innerText) {
        confirmBox("",`Model already active with same name ${model_name}`)
        return
      }
    }

    let template_el = document.getElementById('model_template')
    let model_template = 'Sample DB'

    if (template_el) {
      model_template = template_el.value
    }

    let project_name = 'Default'

    hideModal() // close modal
    
    let data = {
      model_name: model_name,
      model_template: model_template,
      project_name: project_name,
      schemas: schema,
      db_user: '',
      password: '',
      host: '',
      port: 0,
      db_type: 'SQLITE'
    }

    const res = await fetchData('home', 'addNewModel', data)

    if (res.msg === 'Success') {
      let model_body = document.getElementById("availableModal")
      model_body.appendChild(get_li_element([model_name, model_template, project_name, 'SQLITE']))
      model_body.lastChild.click()
      confirmBox("Success!", "New Model Added")
    } else {
      confirmBox("Alert!", res.msg)
    }
  }

  showModal()
}

function valid_string(string) {
    var pattern = /^[a-zA-Z0-9_]+$/;
    return pattern.test(string);
}

function get_addModel_row(div_id, label_text, id, input_type, options = [], placeholder_text = '', icon_class = '', input_typ = 'text') {
    let inputDiv;

    // Main wrapper (row)
    const main_div = get_cl_element(
        "div",
        "flex flex-col sm:flex-row items-center mb-4",
        div_id
    );

    // Label
    let label = get_cl_element(
        "div",
        "w-full sm:w-1/3 px-2",
        null,
        get_cl_element("label", "block text-base font-semibold my-2", null, document.createTextNode(label_text))
    );

    // Input container
    inputDiv = get_cl_element("div", "w-full sm:w-2/3 px-2");

    if (input_type === 'select') {
        const input_el = get_cl_element("select", "w-full select", id);

        if (options.includes('Default') || options.length === 0) {
            input_el.appendChild(get_cl_element("option", null, null, document.createTextNode('Default')));
        }

        for (let mtype of options) {
            if (mtype !== 'Default') {
                let opt = get_cl_element("option", null, null, document.createTextNode(mtype));
                input_el.appendChild(opt);
            }
        }

        if (input_el.firstChild) {
            input_el.firstChild.setAttribute("selected", "");
            inputDiv.appendChild(input_el);
        }
    } else {
        const input_group = get_cl_element("div", "relative flex items-center");
        const input_el = get_cl_element("input", "input", id);
        input_el.setAttribute("type", input_typ);
        input_el.setAttribute("placeholder", placeholder_text);

        input_group.appendChild(input_el);

        if (icon_class.trim() !== '') {
            // icon on right side
            const iconWrapper = get_cl_element("span", "absolute right-2 text-gray-400 pointer-events-none", null,
                get_cl_element("span", icon_class)
            );
            input_group.appendChild(iconWrapper);
        }

        inputDiv.appendChild(input_group);
    }

    main_div.appendChild(label);
    main_div.appendChild(inputDiv);

    return main_div;
}

function get_li_element(model_name) {
    let el = get_cl_element("li", "deselected-button mb-2 cursor-pointer", null, null);
    
    let el_child = get_cl_element("div", "flex items-center space-x-2");
    
    
    el_child.appendChild(get_cl_element("span", `${icons_class['DB_Icon']}`,null, null));
    el_child.appendChild(get_cl_element("span","text-sm font-medium", null, document.createTextNode(model_name[0])));
    
    el.appendChild(el_child);
    
    el.setAttribute("project", model_name[2]);
    el.setAttribute("template", model_name[1]);
    el.setAttribute("dbtype", model_name[3]);

    el.onclick = async function (e) {
        let proj_name = el.getAttribute('project');
        document.getElementById('outputTxt').innerHTML = "";
        
        if (!this.classList.contains("selected-button")) {
            // UPGRADE VERSION
            let version = await fetchData('home','getVersion',{ model_name: this.innerText })
            if (version !== current_version){
                await fetchData('home','upgradeVersion',{ modelName: this.innerText,db_version:version,current_version: current_version})
            }
            
            for (let cn of this.parentNode.querySelectorAll("li.selected-button")) {
                cn.classList.remove("selected-button");
                cn.classList.add("deselected-button");
            }
            
            get_model_tables(this.innerText, model_name[1]);

            this.classList.add("selected-button");
            this.classList.remove("deselected-button");
            e.preventDefault();
        }

        // Add TaskType column if not exists
        const db_name = this.innerText;
        const column_info = await executeQuery('fetchData', db_name, "PRAGMA table_info(S_TaskMaster)");
        const column_names = column_info.map(col => col[1]);
        
        if (!column_names.includes("TaskType")) {
            await executeQuery('executeQuery', db_name, 
                "ALTER TABLE S_TaskMaster ADD COLUMN TaskType VARCHAR DEFAULT 'PythonScript'"
            );
        }

        // Create required tables if not exists
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

        await populateExecutableFiles(this.innerText);
    }
    return el;
}

async function get_model_tables(model_name,template) {
    document.getElementById("tableGroup").innerHTML = ""    
    const data = await fetchData('home','fetchTableGroups',{ model_name: model_name })

    for (let group_name in data) {
        document.getElementById("tableGroup").appendChild(get_accordian(group_name, data[group_name]))
    }    
}

async function get_user_models() {
    document.getElementById("tableGroup").innerHTML = ""
    let all_models = await fetchData('home','getUserModels')
    if (all_models.length == 0){
        let model = await addDefaultModel(schema)
        if ((model).length > 0){
            all_models.push(model)
        }
    }
    populate_models(all_models)
    return all_models
}

function populate_models(model_names) {
    let model_body = document.getElementById("availableModal")
    model_body.innerHTML = ""
    for (let model_name of model_names) {
        model_body.appendChild(get_li_element(model_name))
    }

    if (modelUID && model_body.lastChild){
        model_body.lastChild.click()
    }else if ( model_body.firstChild){
        model_body.firstChild.click()
    }
}

function get_accordian(group_name, table_list) {
    let accordian_id = group_name.replace(/\s/g, "_")

    // Accordion wrapper
    let card_border = get_cl_element("div", "border border-border")

    // Accordion header (button)
    let button = get_cl_element("button",
        "w-full flex justify-between items-center pl-6 pr-3 py-6 bg-transparent rounded-t cursor-pointer focus:outline-none accordion-header",
        accordian_id + "_head",
        get_cl_element("span", "font-medium text-card-foreground", null, document.createTextNode(group_name))
    )

    // Add SVG toggle icon
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("class", "h-4 w-4 transition-transform duration-200")
    svg.setAttribute("fill", "none")
    svg.setAttribute("stroke", "currentColor")
    svg.setAttribute("stroke-width", "2")
    svg.setAttribute("viewBox", "0 0 24 24")

    let path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("d", "M12 5v14m-7-7h14") // plus icon
    svg.appendChild(path)

    button.appendChild(svg)

    // Accordion content
    let card_body = get_cl_element("div", "accordion-content hidden px-4 pb-3", accordian_id,
        get_cl_element("div", "", null, null)
    )

    // Add each table as a clickable div
    for (let table_name of table_list) {
        let el = get_cl_element("div", "p-3 border-b-3 border-primary hover:bg-muted cursor-pointer", null,
            document.createTextNode(table_name[1])
        )

        el.onclick = function () {
            const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
            window.open(`./tableDisplay.html?tableName=${table_name[0]}&modelName=${selected_model.innerText}`);
        }
        el.setAttribute("tableName", table_name[0])

        card_body.firstChild.appendChild(el)
    }

    // Assemble accordion
    card_border.appendChild(button)
    card_border.appendChild(card_body)

    // Add click event for accordion toggle
    button.addEventListener("click", function () {
        let target_id = this.getAttribute("id").replace("_head", "")
        let content = document.getElementById(target_id)

        // Close all other accordions
        document.querySelectorAll(".accordion-content").forEach(el => {
            if (el.id !== target_id) {
                el.classList.add("hidden")
                el.previousSibling.querySelector("svg").classList.remove("rotate-45")
            }
        })

        // Toggle current accordion
        content.classList.toggle("hidden")
        this.querySelector("svg").classList.toggle("rotate-45")
    })

    return card_border
}

async function addExistingModel() {
    const [modal_body, add_btn] = populate_modal("Add Existing Models", "Add")
    const temp_dict = new Object

    
    const data = await fetchData('home','getExistingModels')
    let model_dict = new Object
    for (let cn of data) {
        let project_name = cn[1]
        let model_name = cn[0]
        temp_dict[model_name] = [project_name, cn[2],cn[3]]
        if (project_name in model_dict) {
            model_dict[project_name].push([model_name,cn[2]])
        } else {
            model_dict[project_name] = [[model_name,cn[2]]]
        }
    }
    modal_body.appendChild(get_scc_tree(model_dict))


    add_btn.onclick = async function () {
        let model_names = []
        for (let cn of document.getElementById("availableModal").querySelectorAll("li")){
            model_names.push(cn.innerText)
        }
        let projects_dict = {}
        let model_list = []
        for (let cn of modal_body.querySelectorAll(".TreeMembers li")) {
            if (cn.parentNode.classList.contains("childList")) {
                if (cn.firstChild.checked) {
                    if (model_names.includes(cn.innerText)){
                        confirmBox('Alert!',`Model Already Active with name ${cn.innerText}`)
                        return
                    }
                    
                    let project_name = cn.parentNode.previousElementSibling.innerText
                    if(!(project_name in projects_dict)){
                        projects_dict[project_name] = []
                    }
                    projects_dict[project_name].push(cn.innerText)
                    if (model_list.includes(cn.innerText)){
                        confirmBox('Alert!',"You Cannot Add more than one model of same name")
                        return
                    }
                    model_list.push(cn.innerText)
                   
                }
            }
        }
        
        if (Object.keys(projects_dict).length > 0) {
            hideModal()
            const data = await fetchData('home','addExistingModels',{ model_list: model_list,projects_dict:projects_dict })
            let model_body = document.getElementById("availableModal")
            for (let model_name of model_list) {
                model_body.appendChild(get_li_element([model_name, temp_dict[model_name][1],
                    temp_dict[model_name][0],temp_dict[model_name][2]]))
            }
        } else {
            hideModal()
        }
    }
    showModal()
}

function get_scc_tree(model_dict,parent_icon = "fa-server",project = null) {
    let tree = get_cl_element("ul", "tree pl-8 mb-4")
    for (let project_name in model_dict) {
        tree.appendChild(document.createElement("li"))
        let parent = get_tree_li_element(project_name, parent_icon)
        tree.appendChild(parent)
        parent.onclick = function () {
            let ul = parent.nextElementSibling
            if (parent.firstChild.checked) {
                parent.firstChild.checked = false
                for (let li of ul.childNodes) {
                    if (li.firstChild.checked) {
                        li.firstChild.checked = false
                    }
                }
            } else {
                parent.firstChild.checked = true
                for (let li of ul.childNodes) {
                    if (!li.firstChild.checked) {
                        li.firstChild.checked = true
                    }
                }
            }

        }
        tree.appendChild(get_cl_element("ul", "childList TreeMembers pl-8"))
        for (let model_name of model_dict[project_name]) {
            let el = get_tree_li_element(model_name[0], icons_class['DB_Icon'])
            if (!project){
                el.onclick = function (e) {
                    if (el.firstChild.checked) {
                        el.firstChild.checked = false
                        if (parent.firstChild.checked) {
                            parent.firstChild.checked = false
                        }
                    } else {
                        el.firstChild.checked = true
                        parent.firstChild.checked = true
                        for (let cn of this.parentNode.childNodes) {
                            if (!cn.firstChild.checked) {
                                parent.firstChild.checked = false
                            }
                        }
                    }
                }
            }
            tree.lastChild.appendChild(el)
        }
    }
    return get_cl_element("div", "card-body scc-box", null, tree)
}

function remove_modal (del_btn) {
    let cancel_text = "Hide"
    let header_text = "Hide Models"
    if(del_btn){
        cancel_text = "Delete"
        header_text = "Delete Models"
    }

    const [modal_body, add_btn] = populate_modal(header_text, cancel_text)
    let model_dict = new Object
    for (let cn of document.getElementById("availableModal").childNodes) {
        let project_name = cn.getAttribute("project")
        let template_name = cn.getAttribute("template")
        let model_name = cn.innerText
        if (project_name in model_dict) {
            model_dict[project_name].push([model_name,template_name])
        } else {
            model_dict[project_name] = [[model_name,template_name]]
        }
    }
    modal_body.appendChild(get_scc_tree(model_dict))
    
    add_btn.onclick = async function () {
        let model_list = []
        let projects_dict = {}
        for (let cn of modal_body.querySelectorAll(".TreeMembers li")) {
            if (cn.parentNode.classList.contains("childList")) {
                if (cn.firstChild.checked) {
                    model_list.push(cn.innerText)
                    let project_name = cn.parentNode.previousElementSibling.innerText
                    if(!(project_name in projects_dict)){
                        projects_dict[project_name] = []
                    }
                    projects_dict[project_name].push(cn.innerText)   
                }
            }          
        }

        if (Object.keys(projects_dict).length > 0) {
            hideModal()
            
            const data = await fetchData('home','deleteModel',{
                projects_dict:projects_dict,
                del_opt: del_btn,
            })
           
            let modals = document.getElementById('availableModal')
            for (let cn of modals.querySelectorAll("li")) {
                if (model_list.indexOf(cn.innerText) > -1) {
                    cn.remove()                        
                }
            }
            
            if (modals.firstChild){
                modals.firstChild.click()
            }else{
                document.getElementById("tableGroup").innerHTML = ""
            }
            confirmBox("Success!", "Model Removed Successfully")
            
        } else {
            confirmBox("Alert!", "Please select atleast one model")
        }
    }
    showModal()
}

function get_tree_li_element(level_name, span) {
    let el = get_cl_element("li", null, null, get_cl_element("input", "inputcheckbox"))
    el.firstChild.setAttribute("type", "checkbox")
    let label = get_cl_element("label", "checkBox-label", null,
        get_cl_element("span", `fas ${span}`), null)
    label.appendChild(document.createTextNode(level_name))
    el.appendChild(label)
    return el
}


function saveAsModel(e) {
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    if (!selected_model) {
        confirmBox("Alert!", "Please select a model")
        return
    }
    if (selected_model.getAttribute("dbtype")!="SQLITE"){
        confirmBox("Alert!", "Method is applicable only for SQLITE type models")
        return
    }
    else{
        const model_name = selected_model.innerText
        const selected_project_name = selected_model.getAttribute("project")
        const selected_project_template = selected_model.getAttribute("template")
        const model_type = selected_model.getAttribute("dbtype")

        const [modal_body, add_btn] = populate_modal("Save As", "Save")
        const form_div = get_cl_element("div", "form-group mb-4")
        
        form_div.appendChild(get_addModel_row('new_modelName_div','New Model Name','new_model_name','normal',[],'','fas fa-database'))

        modal_body.appendChild(form_div)

        add_btn.onclick =async function (e) {
            const new_model_name = document.getElementById('new_model_name').value
            if (new_model_name.trim() == "" || !valid_string(new_model_name)) {
                confirmBox("Alert!", "Please enter valid model name")
                return
            }

            for (let cn of document.getElementById("availableModal").querySelectorAll("li")){
                if(new_model_name.trim()==cn.innerText){
                    confirmBox("Alert!", `Model already active with same name ${new_model_name}`)
                    return
                }
            }
            
            hideModal()
            
            const data = await fetchData('home','saveAsModel',{
                new_model_name: new_model_name,
                new_model_template: selected_project_template,
                project_name: selected_project_name,
                model_name: model_name
            })
            if (data['message'].indexOf('Invalid') > -1) {
                confirmBox('Alert', data['message'])
                return
            }
            
            let model_body = document.getElementById("availableModal")
            model_body.appendChild(get_li_element([new_model_name, selected_project_template, selected_project_name,model_type]))
            model_body.lastChild.click()
            confirmBox("Success!", "Save As Model Added")
        }
    }
    showModal()
}

function uplaodModel(e) {
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    if (!selected_model) {
        confirmBox("Alert!", "Please select a model")
        return
    }

    const model_name = selected_model.innerText
    const template = selected_model.getAttribute("template")
    const [modal_body, add_btn] = populate_modal("Restore Model", "Upload")

    // File input wrapper
    const form_div = document.createElement("div")
    form_div.className = "flex items-center w-full border border-gray-300 rounded-md overflow-hidden bg-white"

    // Hidden file input
    const input_div = document.createElement("input")
    input_div.type = "file"
    input_div.accept = ".db, .sqlite3"
    input_div.className = "hidden"
    input_div.id = "fileInput"

    // Custom browse button
    const browse_btn = document.createElement("label")
    browse_btn.setAttribute("for", "fileInput")
    browse_btn.className = "cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 border-r border-gray-300 hover:bg-gray-200"
    browse_btn.innerText = "Browse..."

    // File name display
    const file_name = document.createElement("span")
    file_name.className = "px-3 py-2 text-gray-600 text-sm truncate flex-1"
    file_name.innerText = "No file selected."

    // On file select
    input_div.addEventListener("change", (e) => {
        file_name.innerText = input_div.files.length > 0 ? input_div.files[0].name : "No file selected."
    })

    form_div.appendChild(browse_btn)
    form_div.appendChild(file_name)
    form_div.appendChild(input_div)
    modal_body.appendChild(form_div)

    add_btn.onclick = async function (e) {
        if (input_div.files[0]) {
            add_btn.setAttribute("disabled", "")
            add_btn.innerHTML = `<span class="animate-spin border-2 border-t-transparent border-white rounded-full w-4 h-4 inline-block"></span>`

            const data = await uploadFile('home', 'uploadModel', input_div.files[0], { model_name: model_name })
            input_div.value = null
            file_name.innerText = "No file selected."
            add_btn.removeAttribute("disabled", "")
            add_btn.innerHTML = "Upload"
            hideModal()
            confirmBox("Success!", "Model Uploaded Successfully")
            get_model_tables(model_name, template)
        } else {
            confirmBox("Alert!", "Please choose a model")
        }
    }

    showModal()
}

async function downloadModel(e) {
    let loader = document.getElementById('data-loader')
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    if (!selected_model) {
        confirmBox("Alert!", "Please select a model")
        return
    }
    const model_name = selected_model.innerText
    const projectName = selected_model.getAttribute('project')
    loader.style.display = ""
    
    await fetchData('home','downloadModel',{ model_name: model_name,project_name:projectName })
    loader.style.display = "none"

}

function uploadExcelFile(e) {
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    if (!selected_model) {
        confirmBox("Alert!", "Please select a model")
        return
    }
    const model_name = selected_model.innerText
    const [modal_body, add_btn] = populate_modal("Upload Excel", "Upload")

    // File input wrapper
    const form_div = document.createElement("div")
    form_div.className = "flex items-center w-full border border-gray-300 rounded-md overflow-hidden bg-white"

    // file input
    const input_div = document.createElement("input")
    input_div.type = "file"
    input_div.accept = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    input_div.className = "hidden"
    input_div.id = "excelFileInput"

    // Custom browse button
    const browse_btn = document.createElement("label")
    browse_btn.setAttribute("for", "excelFileInput") // ✅ fixed
    browse_btn.className = "cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 border-r border-gray-300 hover:bg-gray-200"
    browse_btn.innerText = "Browse..."

    // File name display
    const file_name = document.createElement("span")
    file_name.className = "px-3 py-2 text-gray-600 text-sm truncate flex-1"
    file_name.innerText = "No file selected."

    // On file select
    input_div.addEventListener("change", () => {
        file_name.innerText = input_div.files.length > 0 ? input_div.files[0].name : "No file selected."
    })

    // Append children in correct order
    form_div.appendChild(browse_btn)
    form_div.appendChild(file_name)
    form_div.appendChild(input_div)
    modal_body.appendChild(form_div)

    // Upload button click
    add_btn.onclick = async function (e) {
        selectedFile = input_div.files[0]
        if (selectedFile) {
            add_btn.setAttribute("disabled", "")
            add_btn.innerHTML = `
                <span class="animate-spin border-2 border-t-transparent border-white rounded-full w-4 h-4 inline-block"></span>`

            const excelInfo = await get_uploadExcel_info(model_name, [], selectedFile)
            
            excelUploadInfo = excelInfo

            hideModal()

            // show info modal
            openUploadExcelModal()

            input_div.value = null
            file_name.textContent = "No file selected."
            add_btn.innerHTML = "Upload"
            add_btn.removeAttribute("disabled")
        } else {
            confirmBox("Alert!", "Please choose a file")
        }
    }
    showModal()
}

function openUploadExcelModal() {
    const modal = document.getElementById('modal-uploadExcel-info');
    const body_el = modal.querySelector('.modal-body');
    body_el.innerHTML = '';

    // Table wrapper
    const header_row = get_cl_element("tr");
    const form_div = get_cl_element(
        "div",
        "overflow-y-auto max-h-72 border rounded-md",
        null,
        get_cl_element(
            "table",
            "min-w-full border border-gray-300 text-sm text-left",
            null,
            get_cl_element("thead", "bg-gray-100", null, header_row)
        )
    );

    // Add table headers
    header_row.appendChild(get_cl_element("th", "px-3 py-2 border border-gray-300", null, document.createTextNode("Sheet Name")));
    header_row.appendChild(get_cl_element("th", "px-3 py-2 border border-gray-300", null, document.createTextNode("Upload Option")));

    
    // Body rows
    const tbody = get_cl_element("tbody","divide-y divide-gray-200");
    form_div.firstChild.appendChild(tbody);
    body_el.appendChild(form_div);
    
    for (let filename in excelUploadInfo) {
        let tr = get_cl_element("tr", "border-b");

        // Sheet name
        tr.appendChild(get_cl_element("td", "px-3 py-2 border border-gray-300", null, document.createTextNode(filename)));

        // Dropdown
        const select = get_cl_element(
            "select",
            "w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring focus:ring-indigo-200"
        );

        const existOptions = [
            { value: "purgeAndUpload", text: "Purge and Upload" },
            { value: "createAndUpload", text: "Drop Table and Upload" },
            { value: "ignore", text: "Ignore" },
        ];

        const newOptions = [
            { value: "ignore", text: "Ignore" },
            { value: "createAndUpload", text: "Create and Upload" },
        ];

        if (excelUploadInfo[filename][0] === "New") {
            newOptions.forEach((optionData) => {
                const option = get_cl_element("option");
                option.value = optionData.value;
                option.textContent = optionData.text;
                select.appendChild(option);
            });
        } else {
            existOptions.forEach((optionData) => {
                const option = document.createElement("option");
                option.value = optionData.value;
                option.textContent = optionData.text;
                if (
                    optionData.value == "ignore" &&
                    excelUploadInfo[filename][1] != "Input"
                ) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }

        tr.appendChild(get_cl_element("td", "px-3 py-2 text-center", null, select));
        tbody.appendChild(tr);
    }

    // Show modal
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeUploadExcelModal() {
    const modal = document.getElementById('modal-uploadExcel-info');
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

document.getElementById('saveFileName').onclick = async function () {
    // Disable button
    this.setAttribute("disabled", "true")
    this.innerHTML = `
        <span class="animate-spin border-2 border-t-transparent border-white rounded-full w-4 h-4 inline-block"></span>
    `

    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    const model_name = selected_model.innerText
    const template = selected_model.getAttribute("template")

    const body_el = document.getElementById('modal-uploadExcel-info').querySelector('tbody')
    const uploadInfo = {}
    for (let tr of body_el.querySelectorAll('tr')) {
        const label = tr.firstElementChild.innerText
        const selectVal = tr.querySelector('select').value
        uploadInfo[label] = selectVal
    }
    
    const data = await uploadExcel(model_name, Object.keys(uploadInfo), selectedFile, uploadInfo)

    closeUploadExcelModal()

    confirmBox("Success!", "Excel Uploaded Successfully")
    update_excel_log(data, uploadInfo)
    get_model_tables(model_name, template)

    // Reset button
    this.innerText = 'Upload'
    this.removeAttribute('disabled')
}

function update_excel_log(rows, uploadInfo) {
    // Build modal container
    const [modal_body, add_btn] = populate_modal("Status", "OK");

    // Table wrapper with scroll
    const form_div = get_cl_element("div", "overflow-y-auto max-h-72 border rounded-md");

    // Tailwind styled table
    const table = get_cl_element("table", "w-full border border-gray-300 text-sm text-left");

    const thead = get_cl_element("thead", "bg-gray-100");
    const header_row = get_cl_element("tr");

    header_row.appendChild(get_cl_element("th", "px-3 py-2 border border-gray-300", null, document.createTextNode("SheetName")));
    header_row.appendChild(get_cl_element("th", "px-3 py-2 border border-gray-300", null, document.createTextNode("Status")));
    header_row.appendChild(get_cl_element("th", "px-3 py-2 border border-gray-300", null, document.createTextNode("Msg")));

    thead.appendChild(header_row);
    table.appendChild(thead);

    const tbody = get_cl_element("tbody", "divide-y divide-gray-200");

    for (let rw in rows) {
        let tr = get_cl_element("tr", "hover:bg-gray-50");

        // SheetName column
        tr.appendChild(get_cl_element("td", "px-3 py-2 border border-gray-300", null, document.createTextNode(rw)));

        let status, message;
        if (!isNaN(rows[rw]) && uploadInfo[rw] == 'createAndUpload') {
            status = "Create And Uploaded";
            message = `${rows[rw]} rows inserted`;
        } else if (!isNaN(rows[rw]) && uploadInfo[rw] == 'purgeAndUpload') {
            status = "Purge And Uploaded";
            message = `${rows[rw]} rows inserted`;
        } else {
            status = "Errored";
            message = rows[rw];
        }

        // Status column
        tr.appendChild(get_cl_element("td", "px-3 py-2 border border-gray-300 font-medium text-blue-600", null, document.createTextNode(status)));

        // Msg column
        tr.appendChild(get_cl_element("td", "px-3 py-2 border border-gray-300 text-gray-700", null, document.createTextNode(message)));

        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    form_div.appendChild(table);
    modal_body.appendChild(form_div);

    showModal()

    add_btn.onclick = function () {
        hideModal()
    };
}

function downloadExcelFile(e) {
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    if (!selected_model) {
        confirmBox("Alert!", "Please select a model")
        return
    }

    const table_groups = []

    for (let el of document.getElementById("tableGroup").querySelectorAll("button.accordion-header")) {
        table_groups.push(el.innerText)
    }

    const model_name = selected_model.innerText
    const [modal_body, add_btn1] = populate_modal("Download Excel", "Download")
    for (let group_name of table_groups) {
        const input_div = get_cl_element("input", "input")
        input_div.setAttribute("type", "checkbox")
        input_div.checked = true

        const form_div = get_cl_element("label", "label gap-3 mb-2")
        form_div.appendChild(input_div)
        form_div.appendChild(document.createTextNode(group_name))

        modal_body.appendChild(form_div)
    }

    const modal_footer = scc_one_modal.querySelector(".modal-footer")
    modal_footer.innerHTML = ""
    
    const footer_flex = get_cl_element("div", "w-full");
    const empty_input = get_cl_element("input", "input", "emptyCheck");
    empty_input.type = "checkbox";
    empty_input.checked = true;

    const empty_label = get_cl_element("label", "label ml-2", null, document.createTextNode("Include Empty Tables"));
    empty_label.setAttribute("for", "emptyCheck");

    const empty_form_div = get_cl_element("div", "flex mb-4", null);
    empty_form_div.appendChild(empty_input);
    empty_form_div.appendChild(empty_label);

    const cancel_button = get_cl_element("button","btn-secondary", null, document.createTextNode("Cancel"))
    cancel_button.onclick = hideModal

    // Add Button
    const add_btn = get_cl_element("button","btn ml-auto",null,document.createTextNode("Download"))
    modal_footer.appendChild(cancel_button)
    modal_footer.appendChild(add_btn)


    const btn_group = get_cl_element("div", "flex justify-between align-items-center", null);
    btn_group.appendChild(cancel_button);
    btn_group.appendChild(add_btn);
    footer_flex.appendChild(empty_form_div);
    footer_flex.appendChild(btn_group);
    modal_footer.prepend(footer_flex);
    
    add_btn.onclick = async function (e) {
        let table_groups = []
        for (let el of modal_body.querySelectorAll("input:checked")) {
            table_groups.push(el.parentNode.innerText)
        }
        hideModal()

        let loader = document.getElementById("dl_progress_div")
        loader.classList.remove('hidden')
        const empty_check = document.getElementById('emptyCheck').checked
        
        const x = await downloadExcel(model_name,[], table_groups, empty_check)

        // loader.querySelector('div').innerText = 'Running'
        loader.classList.add('hidden')

    }
    showModal()
}

async function vacuumModel(e) {
    const dropdown = document.getElementById('dashboard-dropdown');
    dropdown.classList.toggle('hidden');
    let loader = document.getElementById('data-loader')
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    if (!selected_model) {
        confirmBox("Alert!", "Please select a model")
        return
    }
    const model_name = selected_model.innerText
    
    loader.style.display = ""
    const x = await executeQuery('executeQuery',model_name,'VACUUM')
    loader.style.display = "none"
    confirmBox("Success!", "Model Vacuumed Successfully")
}


document.getElementById('model-createView').onclick = function(){
    document.getElementById("viewName").value = ""
    document.getElementById("query-input").value = ""
    const modal = document.getElementById('createView-modal');
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

async function create_view(){
    const view_name = document.getElementById("viewName").value
    const view_query = document.getElementById("query-input").value
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button").innerText
    if (!selected_model) {
        confirmBox("Alert!", "Please select a model")
        return
    }
    if (view_name.trim() == "" || view_query.trim()==""){
        confirmBox("Alert!","Please make sure that View Name and Query was entered")
    }
   
    await fetchData('home','checkOrCreateView',{view_name:view_name,view_query:view_query,model_name:selected_model,isExist:false})
    document.getElementById('createView-modal').classList.add('hidden')
    document.getElementById("viewName").value = ""
    document.getElementById("query-input").value = ""
    confirmBox("Success","View created successfully")
    get_model_tables(selected_model,null)
}

async function uploadPackage(e) {
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    if (!selected_model) {
        confirmBox("Alert!", "Please select a model")
        return
    }

    const [modal_body, add_btn] = populate_modal("Upload Package", "Upload")
    // File input wrapper
    const form_div = document.createElement("div")
    form_div.className = "flex items-center w-full border border-gray-300 rounded-md overflow-hidden bg-white"

    // Hidden file input
    const input_div = document.createElement("input")
    input_div.type = "file"
    input_div.accept = ".whl"
    input_div.className = "hidden"
    input_div.id = "fileInput"

    // Custom browse button
    const browse_btn = document.createElement("label")
    browse_btn.setAttribute("for", "fileInput")
    browse_btn.className = "cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 border-r border-gray-300 hover:bg-gray-200"
    browse_btn.innerText = "Browse..."

    // File name display
    const file_name = document.createElement("span")
    file_name.className = "px-3 py-2 text-gray-600 text-sm truncate flex-1"
    file_name.innerText = "No file selected."

    // On file select
    input_div.addEventListener("change", (e) => {
        file_name.innerText = input_div.files.length > 0 ? input_div.files[0].name : "No file selected."
    })

    form_div.appendChild(browse_btn)
    form_div.appendChild(file_name)
    form_div.appendChild(input_div)
    modal_body.appendChild(form_div)

    add_btn.onclick = async function (e) {
        let selectedFile = input_div.files[0]
        if(selectedFile){
            add_btn.setAttribute("disabled", "")
            add_btn.innerHTML = `<span class="animate-spin border-2 border-t-transparent border-white rounded-full w-4 h-4 inline-block"></span>`    
            const arrayBuffer = await input_div.files[0].arrayBuffer();                
            try {
                let query = `INSERT INTO S_PackageWheels (WheelName,WheelBlob) VALUES (?, ?) ON CONFLICT (WheelName) DO UPDATE SET WheelBlob = ?`
                await executeQuery('insertData',selected_model.innerText,query,[input_div.files[0].name,new Uint8Array(arrayBuffer),new Uint8Array(arrayBuffer)])                        
                confirmBox('Success',"Package uploaded successfully!");
            } catch (error) {
                console.error("Error saving file:", error);
            }

            hideModal()
            
            input_div.value = null
            add_btn.innerHTML = "Upload"
            add_btn.removeAttribute("disabled", "")
        }else{
            confirmBox("Alert!", "Please choose a file")
        }
        
    }
    showModal()
}

async function saveFiles(){
    this.setAttribute("disabled", "")
    this.innerHTML = `<span class="animate-spin border-2 border-t-transparent border-white rounded-full w-4 h-4 inline-block"></span>`
    
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    const inp_el = document.getElementById('inpFiles')

    if (inp_el.files.length > 0){
        const delQuery = `DELETE FROM S_DataFiles;`
        await executeQuery('executeQuery',selected_model.innerText,delQuery,['script'])

        for (const file of inp_el.files) {
            const arrayBuffer = await file.arrayBuffer();
            let query = `INSERT INTO S_DataFiles (FileName,FileType,FileBlob) 
                            VALUES (?, ?, ?) ON CONFLICT (FileName,FileType) DO UPDATE SET FileBlob = ? `
            await executeQuery('insertData',selected_model.innerText,query,[file.name,'Input',new Uint8Array(arrayBuffer),new Uint8Array(arrayBuffer)])
        }

        this.removeAttribute("disabled", "")
        this.innerHTML = "Upload"
        document.getElementById('modal-upload-files').classList.add('hidden')
        confirmBox('Success','Files Upload Successfully.')
    }

    inp_el.value = null
}

async function populateInputFiles(){
    const body_el = document.getElementById('modal-input-files').querySelector('.modal-body')
    body_el.innerHTML = ''

    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")

    const query = `SELECT FileId,FileName FROM S_DataFiles WHERE FileType = 'Input' `
    const files = await executeQuery('fetchData',selected_model.innerText,query)

    const header_row = get_cl_element("tr")
    const form_div = get_cl_element("div", "overflow-y-auto max-h-72 mb-4", null,
        get_cl_element("table", "w-full text-sm text-left", null,
            get_cl_element("thead", "bg-gray-100", null, header_row)))

    form_div.style.maxHeight = "300px"
    form_div.style.overflowY = "auto"

   
    const tbody = get_cl_element("tbody")
    form_div.firstChild.appendChild(tbody)
    body_el.appendChild(form_div)


    for (let file of files){
        const tr = get_cl_element("tr",'flex items-center')
        tr.appendChild(get_cl_element("td", 'w-full p-2 border border-gray-300', null, document.createTextNode(file[1])))

        const del_td = get_cl_element("td","px-3 py-2 border border-gray-300 text-gray-700")
        let del_el = get_cl_element('span','fa fa-trash')
        del_el.onclick = delInputFile.bind(null,file[1],file[0])
        del_td.appendChild(del_el)

        const download_td = get_cl_element("td","px-3 py-2 border border-gray-300 text-gray-700")
        let download_el = get_cl_element('span','fa fa-download')
        download_el.onclick = downloadInputFile.bind(null,file[1],file[0])
        download_td.appendChild(download_el)

        const upload_td = get_cl_element("td","px-3 py-2 border border-gray-300 text-gray-700")
        let upload_el = get_cl_element('span','fa fa-upload')
        upload_el.onclick = uploadInputFile.bind(null,file[1],file[0])
        upload_td.appendChild(upload_el)

        tr.appendChild(del_td)
        tr.appendChild(upload_td)
        tr.appendChild(download_td)

        tbody.appendChild(tr)
    }   

    const btn_div = get_cl_element('div','flex justify-end')
    let btn_el = get_cl_element('button','btn btn-primary',null,document.createTextNode('Add File'))
    btn_div.appendChild(btn_el)
    body_el.appendChild(btn_div)

    btn_el.onclick = uploadInputFile

}

async function delInputFile(fileName,fileId){
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    const query = `DELETE FROM S_DataFiles WHERE FileType = 'Input' AND FileId = ? AND FileName = ? `
    await executeQuery('deleteData',selected_model.innerText,query,[fileId,fileName])
    populateInputFiles()
}

async function downloadInputFile(fileName,fileId){
    let fileType = document.getElementById('modal-input-files').querySelector('h2').innerText.indexOf('Input') > -1?'Input':'Output'
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    let query = `SELECT FileName,FileBlob FROM S_DataFiles WHERE FileType = ? AND FileID = ? AND FileName = ?`
    const file = await executeQuery('fetchData',selected_model.innerText,query,[fileType,fileId,fileName])

    if (file){
        const fileBlob = new Blob([file[0][1]]);

        // IE doesn't allow using a blob object directly as link href
        // instead it is necessary to use msSaveOrOpenBlob
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(fileBlob);
            return;
        }

        // For other browsers: 
        // Create a link pointing to the ObjectURL containing the blob.
        const data = window.URL.createObjectURL(fileBlob);
        var link = document.createElement('a');
        link.href = data;
        link.download = fileName;
        link.click();
        setTimeout(function () {
            // For Firefox it is necessary to delay revoking the ObjectURL
            window.URL.revokeObjectURL(data);
        }, 1000);
    }else{
        confirmBox('Alert!','No File Exists')
    }
}

function uploadInputFile(fileName = null,fileId = null){
    document.getElementById('modal-input-files').classList.add('hidden')
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    
    const [modal_body, add_btn] = populate_modal("Upload Excel", "Upload")
    // File input wrapper
    const form_div = document.createElement("div")
    form_div.className = "flex items-center w-full border border-gray-300 rounded-md overflow-hidden bg-white"

    // Hidden file input
    const input_div = document.createElement("input")
    input_div.type = "file"
    input_div.className = "hidden"
    input_div.id = "fileInput"

    // Custom browse button
    const browse_btn = document.createElement("label")
    browse_btn.setAttribute("for", "fileInput")
    browse_btn.className = "cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 border-r border-gray-300 hover:bg-gray-200"
    browse_btn.innerText = "Browse..."

    // File name display
    const file_name = document.createElement("span")
    file_name.className = "px-3 py-2 text-gray-600 text-sm truncate flex-1"
    file_name.innerText = "No file selected."

    // On file select
    input_div.addEventListener("change", (e) => {
        file_name.innerText = input_div.files.length > 0 ? input_div.files[0].name : "No file selected."
    })

    form_div.appendChild(browse_btn)
    form_div.appendChild(file_name)
    form_div.appendChild(input_div)
    modal_body.appendChild(form_div)

    add_btn.onclick = async function (e) {
        if(input_div.files[0]){
            add_btn.setAttribute("disabled", "")
            add_btn.innerHTML = `<span class="animate-spin border-2 border-t-transparent border-white rounded-full w-4 h-4 inline-block"></span>`
            
            const arrayBuffer = await input_div.files[0].arrayBuffer();

            if (fileName && fileId){
                let query = `UPDATE S_DataFiles SET FileBlob = ? WHERE FileType = 'Input' AND FileName = ? AND FileId = ? `
                await executeQuery('updateData',selected_model.innerText,query,[input_div.files[0].name,new Uint8Array(arrayBuffer),fileName,fileId])
            }else{
                let query = `INSERT INTO S_DataFiles (FileName,FileType,FileBlob) VALUES (?, ?, ?) ON CONFLICT (FileName,FileType) DO UPDATE SET FileBlob = ?`
                await executeQuery('insertData',selected_model.innerText,query,[input_div.files[0].name,'Input',new Uint8Array(arrayBuffer),new Uint8Array(arrayBuffer)])
            }

            hideModal()
            const inputFileModal = document.getElementById('modal-input-files')
            inputFileModal.classList.remove("hidden", "opacity-0")
            inputFileModal.classList.add("flex")
            input_div.value = null
            add_btn.innerHTML = "Upload"
            add_btn.removeAttribute("disabled", "")
            populateInputFiles()
        }else{
            confirmBox("Alert!", "Please choose a file")
        }
    }
    showModal()
}

async function populateOutputFiles(){
    const body_el = document.getElementById('modal-input-files').querySelector('.modal-body')
    body_el.innerHTML = ''

    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")

    const query = `SELECT FileId,FileName FROM S_DataFiles WHERE FileType = 'Output' `
    const files = await executeQuery('fetchData',selected_model.innerText,query)
    

    const header_row = get_cl_element("tr")
    const form_div = get_cl_element("div", "overflow-y-auto max-h-72 mb-4", null,
        get_cl_element("table", "w-full text-sm text-left", null,
            get_cl_element("thead", "bg-gray-100", null, header_row)))

    form_div.style.maxHeight = "300px"
    form_div.style.overflowY = "auto"

   
    const tbody = get_cl_element("tbody")
    form_div.firstChild.appendChild(tbody)
    body_el.appendChild(form_div)


    for (let file of files){
        const tr = get_cl_element("tr",'flex items-center')
        tr.appendChild(get_cl_element("td", 'w-full', null, document.createTextNode(file[1])))

        const download_td = get_cl_element("td","input-file-icon m-0 px-2")
        let download_el = get_cl_element('span','fa fa-download')
        download_el.onclick = downloadInputFile.bind(null,file[1],file[0])
        download_td.appendChild(download_el)

        tr.appendChild(download_td)

        tbody.appendChild(tr)
    }   

}


async function populateExecutableFiles(modelName){
    const fileDiv = document.getElementById('taskDiv')
    fileDiv.innerHTML = ""
    let query = `SELECT TaskId,TaskName,TaskDisplayName,TaskType FROM S_TaskMaster`
    const files = await executeQuery('fetchData',modelName,query)
    for (let [TaskId,TaskName,TaskDisplayName,TaskType] of files){

        const li_el = get_cl_element('li', 'flex', null); // Create <li> first
        const a_el = get_cl_element('a', 'w-full px-4 py-2 text-sm text-card-foreground hover:bg-muted hover:text-muted-foreground transition-colors cursor-pointer', null, document.createTextNode(TaskDisplayName));
        const btn_edit = get_cl_element('button', 'btn-outline btn-sm edit-btn mr-1 px-1', null, 
            get_cl_element('span', 'fa-solid fa-pencil')
        );
        const button_el = get_cl_element('button', 'btn-outline btn-sm del-btn mr-1 px-1', null, 
            get_cl_element('span', 'fa-solid fa-trash-alt')
        );
        li_el.appendChild(a_el);
        li_el.appendChild(btn_edit)
        li_el.appendChild(button_el);
        li_el.querySelector('button.edit-btn').title = 'Edit Task';
        li_el.querySelector('button.del-btn').title = 'Delete Task';

        li_el.querySelector('button.edit-btn').onclick = async function(e){
            e.stopPropagation()
            const scriptName = document.getElementById("upScName")
            let tskDisNm = li_el.innerText.trim()
            scriptName.innerHTML = ""
            
            let sel_query = `SELECT TaskDisplayName, TaskType, TaskName, TaskId FROM S_TaskMaster WHERE TaskDisplayName = ?`
            let result = await executeQuery('fetchData',modelName, sel_query, [tskDisNm]);
            tsk_id = result[0][3]
            
            let tsktype = result[0][1]
            if (tsktype == 'PythonScript'){
                tsktype = 'PScript'
            }
            else if (tsktype === 'PythonNotebook'){
                tsktype = 'Python'
            }else if (tsktype === 'RNotebook'){
                tsktype = 'R'
            }else if (tsktype === 'JSNotebook'){
                tsktype = 'Javascript'
            }
            if (result && result.length > 0) {
                document.getElementById('upDsName').value = result[0][0];  // TaskDisplayName
                document.getElementById('upScType').value = tsktype //TaskType

                let query
                let res
                if(tsktype === 'PScript'){
                    query = `SELECT FileName FROM S_ExecutionFiles WHERE FileName IS NOT NULL AND FileName LIKE '%.py' AND FilePath NOT LIKE '%/%' AND Status = ?`;
                    res = await executeQuery('fetchData',modelName, query, ['Active']);
                }else{
                    query = `SELECT Name FROM S_Notebooks WHERE Status = ? AND Type = ?`;
                    res = await executeQuery('fetchData',modelName, query, ['Active', tsktype]);
                }
                
                for (const ntNm of res){
                    const li_el  = get_cl_element('option',null,null,document.createTextNode(ntNm))
                    li_el.setAttribute('value',ntNm)
                    scriptName.appendChild(li_el)
                }

                document.getElementById('upScName').value = result[0][2];  // TaskName

                const updateScript = document.getElementById('modal-updateScript')
                updateScript.classList.remove('hidden')
                updateScript.classList.add('flex')
            }
        }
        li_el.querySelector('button.del-btn').onclick = async function(e){
            e.stopPropagation()
            confirmBox('Alert!',`Are you sure you want to delete ${TaskDisplayName}?`,async function(){
                let task_type = TaskType
                if(task_type === 'JavascriptNotebook'){
                    task_type = 'JSNotebook'
                }
                let query = "DELETE FROM S_TaskMaster WHERE TaskId = ? AND TaskType = ? AND TaskName = ?"
                await executeQuery("deleteData",modelName,query,[TaskId,task_type,TaskName])
                confirmBox('Success','Script Deleted Successfully')
                populateExecutableFiles(modelName)
            }, 1, 'Yes', 'No')
        }

        li_el.onclick =async function(){
            const dropdown = document.getElementById('runs-dropdown');
            dropdown.classList.toggle('hidden');
            const canvas = document.getElementById('myCanvas');
            const showOutput = document.getElementById('modal-show-output')
            if(canvas.style.display == "none"){
                canvas.style.display = ""
            }
            document.getElementById("loadingOverlay").classList.remove("hidden");
            document.getElementById("outputDiv").classList.remove("hidden");
            document.getElementById('outputTxt').innerHTML = ""
            if(document.getElementById('downloadOutput').hasAttribute("disabled")){
                document.getElementById('downloadOutput').removeAttribute("disabled")
            }
            const cellBottom = document.getElementById('currCell').querySelector('.cell-bottom');

            if (cellBottom && cellBottom.innerHTML.trim() !== "") {
                cellBottom.innerHTML = "";
            }

            imgBlob = null
            
            const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
            const proj_name = selected_model.getAttribute('project')

            let execFiles
            let filesQuery
            if(TaskType === 'PythonScript'){
                filesQuery = `SELECT FilePath,FileData,FileName FROM S_ExecutionFiles WHERE FileName IS NOT NULL AND Status = 'Active'`;
                execFiles = await executeQuery("fetchData",selected_model.innerText, filesQuery);
                
            }else{
                if(TaskType == 'JSNotebook'){
                    TaskType = 'JavascriptNotebook'
                    window.loadCDNScripts = async function (libraries) {
                        const loadScript = (url, globalVar) => {
                          return new Promise((resolve, reject) => {
                              if (globalVar && window[globalVar]) {
                                    resolve(window[globalVar]);
                                    return;
                                }
                    
                              const script = document.createElement("script");
                              script.src = url;
                              script.async = true;
                              script.onload = () => resolve(window[globalVar] || true);
                              script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
                    
                              document.head.appendChild(script);
                            });
                        };
                    
                        return Promise.all(libraries.map(lib => loadScript(lib.url, lib.globalVar)));
                    }
                    window.loadCDNStylesheets = async function (stylesheets) {
                        return Promise.all(stylesheets.map(({ url }) => {
                            return new Promise((resolve, reject) => {
                                const link = document.createElement("link");
                                link.rel = "stylesheet";
                                link.href = url;
                                link.onload = () => resolve(url);
                                link.onerror = () => reject(`Failed to load CSS: ${url}`);
                                document.head.appendChild(link);
                            });
                        }));
                    }
                    window.getData = async (query, params = []) => executeQuery('getData', modelName, query, params);
                    window.executeQuery = async (query, params = []) => executeQuery('updateData', modelName, query, params);
                }

                filesQuery = `SELECT Name,CellContent,Name FROM S_NotebookContent WHERE Name = ? AND CellType = ?`
                const fileCont = await executeQuery('fetchData',selected_model.innerText,filesQuery,[TaskName,TaskType.replace("Notebook", "").toLowerCase()])
                // Merge the second elements of each sub-array
                let mergedContent = []
                for (const file of fileCont){
                    mergedContent.push(file[1])
                }
                
                // Create the merged array
                execFiles = [[fileCont[0][0], mergedContent, fileCont[0][0]]];
            }
            
            let fileContent = null
            let fileName = ''
            execFiles.forEach(rw => {
                if (rw[0] === TaskName) {
                    fileContent = rw[1]
                    fileName = rw[2]
                }
            });

            const blobQuery = `SELECT FileName,FileBlob FROM S_DataFiles WHERE FileType = 'Input'`
            const blobFiles = await executeQuery("fetchData",selected_model.innerText, blobQuery)

            const wheelQuery = `SELECT WheelName,WheelBlob FROM S_PackageWheels`
            const wheelFiles = await executeQuery("fetchData",selected_model.innerText, wheelQuery)           

            let query = `UPDATE S_Taskmaster SET TaskLastRunDate = ? WHERE TaskId = ? `
            const result = await executeQuery('updateData',selected_model.innerText,query,[get_current_datetime(),TaskId]);

            const task_id = await update_task(TaskName,'Started',null,null,TaskId)

            let res
            if(TaskType == 'PythonScript'){
                let value = ''
                for (let content of fileContent){
                    value += content
                }
                
                res = await executePython('execute','editor',value,proj_name,selected_model.innerText,execFiles,fileName,blobFiles,wheelFiles)
            }else if (TaskType == 'PythonNotebook'){
                for (let content of fileContent){
                    res = await executePython('execute','notebook',content,proj_name,selected_model.innerText,execFiles,null,blobFiles,wheelFiles,'currCell')
                }
            }else if (TaskType == 'JavascriptNotebook'){
                for (let content of fileContent){
                    res = await executeJavascript('currCell', content)
                }
            }else if (TaskType == 'RNotebook'){
                for (let content of fileContent){
                    res = await executeR('currCell', content, selected_model.innerText, blobFiles)
                }
            }

            if (res.stderr){
                update_task(TaskName,'Errored',res.stderr,task_id)
            }else{
                if (res.blob){
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    imgBlob = res.blob
                    const imageBitmap = await createImageBitmap(res.blob);
                    // Calculate the scale factor to fit the image within the canvas while maintaining the aspect ratio
                    const scale = Math.min(canvas.width / imageBitmap.width, canvas.height / imageBitmap.height);
                
                    // Calculate the top-left corner positions to center the image in the canvas
                    const x = (canvas.width - imageBitmap.width * scale) / 2;
                    const y = (canvas.height - imageBitmap.height * scale) / 2;
                
                    ctx.drawImage(imageBitmap, x, y,imageBitmap.width * scale, imageBitmap.height * scale);
                    showOutput.classList.remove('hidden')
                    showOutput.classList.add('flex')
                }
                update_task(TaskName,'Completed',null,task_id)
                if (res.outputFiles && res.outputFiles.length > 0){
                    const delQuery = `DELETE FROM S_DataFiles WHERE FileType = 'Output'`
                    await executeQuery('deleteData',selected_model.innerText,delQuery)

                    res.outputFiles.forEach(async ([filename, fileBlob]) => {
                      let query = `INSERT INTO S_DataFiles (FileName,FileType,FileBlob) 
                                            VALUES (?, ?, ?) ON CONFLICT (FileName,FileType) DO UPDATE SET FileBlob = ? `
                      await executeQuery('insertData',selected_model.innerText,query,[filename,'Output',fileBlob,fileBlob])
                    });
                }
            }
            if(res.success && TaskType != 'PythonScript'){
                showOutput.classList.remove('hidden')
                showOutput.classList.add('flex')
                canvas.style.display = "none"
                document.getElementById('downloadOutput').setAttribute("disabled", "true");
            }
            document.getElementById("loadingOverlay").classList.add("hidden");
            
            displayOutput(res.stderr)
            
        }
        fileDiv.appendChild(li_el)
    }
}

document.getElementById("scType").onchange = async function(){
    const scriptType = document.getElementById("scType").value
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    const scriptName = document.getElementById("scName")
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


document.getElementById("ok-script").onclick = async function(){
    const displayName = document.getElementById("dsName").value
    const scriptType = document.getElementById("scType").value
    const scriptName = document.getElementById("scName").value
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    
    if(displayName.trim() === ''){
        confirmBox("Alert!","Please Enter a display ame")
        return;
    }

    if(scriptType === '0'){
        confirmBox("Alert!","Please select a script language")
        return;
    }
    if(scriptName === '0'){
        confirmBox("Alert!","Please select a notebook")
        return;
    }

    let tsktype
    if (scriptType === 'Python'){
        tsktype = 'PythonNotebook'
    }else if (scriptType === 'R'){
        tsktype = 'RNotebook'
    }else if (scriptType === 'Javascript'){
        tsktype = 'JSNotebook'
    }else if (scriptType === 'PScript'){
        tsktype = 'PythonScript'
    }

    let dis_query = `SELECT TaskDisplayName FROM S_TaskMaster WHERE TaskDisplayName = ?`
    const taskDisName = await executeQuery('fetchData',selected_model.innerText,dis_query,[displayName])
    
    if (taskDisName.length > 0){
        confirmBox("Alert!","Display name already exists")
        return;
    }

    let sel_query = `SELECT TaskName, TaskDisplayName FROM S_TaskMaster WHERE TaskName = ? AND TaskType = ?`
    const task = await executeQuery('fetchData',selected_model.innerText,sel_query,[scriptName,tsktype])
    
    if (task.length > 0){
        confirmBox("Alert!","Script with this name already exists")
        return;
    }

    let query = `INSERT INTO S_TaskMaster (TaskName,TaskDisplayName,TaskType) VALUES (?, ?, ?)`
    await executeQuery('insertData',selected_model.innerText,query,[scriptName,displayName,tsktype])

    await populateExecutableFiles(selected_model.innerText)
    document.getElementById("modal-addScript").classList.add("hidden");
    document.getElementById("dsName").value = ''
    document.getElementById("scType").value = '0'
    document.getElementById("scName").innerHTML = ''
    confirmBox("Success","Script created successfully.")
}

async function downloadOutput() {
    const downloadLink = document.createElement("a");
    downloadLink.href = window.URL.createObjectURL(imgBlob);
    downloadLink.download = "output.jpg";
    downloadLink.click();
  
    setTimeout(function () {
      window.URL.revokeObjectURL(downloadLink.href);
    }, 1000);  
}

function get_current_datetime(){
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-based, so add 1
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    return formattedDateTime
}

async function update_task(taskName,taskStatus,msg = null,assignedTaskId = null,taskId = null){
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    
    if (!assignedTaskId){
        let query = `INSERT INTO T_TaskLogs (TaskId,TaskName,TaskStatus,EndDate) VALUES (?, ?, ?, datetime('now', 'localtime'))`
        const res = await executeQuery('insertData',selected_model.innerText,query,[taskId,taskName,taskStatus])
        return res
    }else{
        let query = `UPDATE T_TaskLogs SET TaskStatus = ?,ErrorMsg = ?, EndDate = datetime('now', 'localtime')
                     WHERE TaskName = ? AND Id = ? `
        const result = await executeQuery('updateData',selected_model.innerText,query,[taskStatus,msg,taskName,assignedTaskId])
    }
}

function displayOutput(stderr) {
    const outputContainer = document.getElementById('outputTxt');  
    if (stderr) {
        const errorElement = document.createElement('div');
        errorElement.textContent = `Error: ${stderr}`;
        errorElement.style.color = 'red';
        outputContainer.appendChild(errorElement);
    }  
}

document.getElementById("update-script").onclick = async function(){
    const displayName = document.getElementById("upDsName").value
    const scriptType = document.getElementById("upScType").value
    const scriptName = document.getElementById("upScName").value
    const selected_model = document.getElementById("availableModal").querySelector("li.selected-button")
    
    if(displayName.trim() === ''){
        confirmBox("Alert!","Please Enter a display ame")
        return;
    }

    if(scriptType === '0'){
        confirmBox("Alert!","Please select a script language")
        return;
    }
    if(scriptName === '0'){
        confirmBox("Alert!","Please select a notebook")
        return;
    }

    let tsktype
    if (scriptType === 'Python'){
        tsktype = 'PythonNotebook'
    }else if (scriptType === 'R'){
        tsktype = 'RNotebook'
    }else if (scriptType === 'Javascript'){
        tsktype = 'JSNotebook'
    }else if (scriptType === 'PScript'){
        tsktype = 'PythonScript'
    }

    let dis_query = `SELECT TaskDisplayName FROM S_TaskMaster WHERE TaskDisplayName = ? AND TaskId != ?`
    const taskDisName = await executeQuery('fetchData',selected_model.innerText,dis_query,[displayName,tsk_id])
    
    if (taskDisName.length > 0){
        confirmBox("Alert!","Display name already exists")
        return;
    }

    let sel_query = `SELECT TaskName, TaskDisplayName FROM S_TaskMaster WHERE TaskName = ? AND TaskType = ? AND TaskId != ?`
    const task = await executeQuery('fetchData',selected_model.innerText,sel_query,[scriptName,tsktype,tsk_id])
    
    if (task.length > 0){
        confirmBox("Alert!","Script with this name already exists")
        return;
    }

    let query = `UPDATE S_TaskMaster SET TaskName = ?, TaskDisplayName = ?,TaskType = ? WHERE TaskId = ?`
    await executeQuery('updateData',selected_model.innerText,query,[scriptName,displayName,tsktype,tsk_id])

    await populateExecutableFiles(selected_model.innerText)
    document.getElementById("modal-updateScript").classList.add('hidden')
    document.getElementById("upDsName").value = ''
    document.getElementById("upScType").value = '0'
    document.getElementById("upScName").innerHTML = ''
    confirmBox("Success","Script updated successfully.")
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