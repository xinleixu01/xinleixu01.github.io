const foodTypes = ["所有", "快餐", "小吃", "中餐", "西餐", "日料", "韩料", "东南亚菜", "火锅", "烧烤", "自助餐", "甜点", "咖啡", "奶茶"];

window.onload = function() {
    const typeContainer = document.getElementById('typeContainer');
    let checkboxesHTML = '';
    foodTypes.forEach(type => {
        checkboxesHTML += `<label><input type="checkbox" name="foodType" value="${type}" onchange="handleFoodTypeChange(this)"><span>${type}</span></label>`
    });
    typeContainer.innerHTML = checkboxesHTML;
};

function handleFoodTypeChange(checkbox) {
    if (checkbox.value === "所有" && checkbox.checked) {
        const checkboxes = document.getElementsByName("foodType");
        checkboxes.forEach(cb => {
            if (cb.value !== "所有") {
                cb.checked = false;
            }
        });
    } else if (checkbox.value !== "所有" && checkbox.checked) {
        document.querySelector('input[value="所有"]').checked = false;
    }
}

function toggleCustomRadius(select) {
    const customRadiusInput = document.getElementById('customRadiusInput');
    if (select.value === 'custom') {
        customRadiusInput.style.display = 'inline-block';
    } else {
        customRadiusInput.style.display = 'none';
    }
}
const key = "f658f0c4704a9904ab291a63d2af50b4";

let currentLng = null;
let currentLat = null;


// =============================
// 页面加载 → 自动定位
// =============================




// =============================
// 自动补全地址
// =============================

function autoComplete() {

    const keyword = document.getElementById("addressInput").value;

    if (keyword.length < 2) {
        document.getElementById("tips").innerHTML = "";
        return;
    }

    const url =
        `https://restapi.amap.com/v3/assistant/inputtips?key=${key}&keywords=${keyword}&citylimit=true`;

    fetch(url)
        .then(res => res.json())
        .then(data => {

            let html = "";

            data.tips.forEach(t => {

                if (!t.location) return;

                html += `
                <div class="tipItem"
                onclick="chooseLocation('${t.location}', '${t.name}')">

                <b>${t.name}</b><br>
                ${t.district || ""}

                </div>
                `;

            });

            document.getElementById("tips").innerHTML = html;

        });

}


// =============================
// 选择地址
// =============================

function chooseLocation(loc, name) {

    document.getElementById("tips").innerHTML = "";
    document.getElementById("addressInput").value = name;

    const [lng, lat] = loc.split(",");

    currentLng = lng;
    currentLat = lat;

}


// =============================
// 定位按钮
// =============================

function locateMe() {

    if (!navigator.geolocation) {
        alert("浏览器不支持定位");
        return;
    }

    navigator.geolocation.getCurrentPosition(position => {

        currentLng = position.coords.longitude;
        currentLat = position.coords.latitude;

        document.getElementById("addressInput").value = "[我的位置]";

    });

}

// =============================
// 开始搜索
// =============================
function startSearch() {
    if(!currentLng || !currentLat) {
        alert("请先输入地址或定位");
        return;
    }

    let radius = document.getElementById("radiusSelect").value;
    if (radius === 'custom') {
        radius = document.getElementById('customRadiusInput').value;
        if (!radius || radius <= 0) {
            alert("请输入有效的自定义距离！");
            return;
        }
    }

    const selectedTypes = [];
    const checkboxes = document.getElementsByName("foodType");
    checkboxes.forEach(cb => {
        if (cb.checked) {
            selectedTypes.push(cb.value);
        }
    });
    
    let type = selectedTypes.join('|');
    if (type.includes("所有") || type === "") {
        type = "美食"; // Use a general category if "所有" is selected or nothing is selected
    }


    searchNearbyRestaurants(currentLng, currentLat, radius, type);
}


// =============================
// 搜索附近餐厅
// =============================

const offset = 25; // Max results per page
const page_num = 2; // Fetch 2 pages to get 50 results
let currentPoiList = [];

function getCardHTML(poi, reason = null) {
    try {
        // Defensive checks for all data from the POI object
        const address = (poi && poi.address) || "未知地址";
        const name = (poi && poi.name) || "未知餐厅";
        const location = poi && poi.location ? poi.location : ``;
        const distance = (poi && poi.distance) || "未知";
        const id = (poi && poi.id) || `random-${Date.now()}`;

        const typeString = (poi && typeof poi.type === 'string') ? poi.type : '';
        const type = typeString ? typeString.split(';').pop() : null;
        
        const costValue = (poi && poi.biz_ext && poi.biz_ext.cost) ? String(poi.biz_ext.cost) : '';
        const cost = costValue.length > 0 ? `人均 ¥${costValue}` : "暂无均价";

        let infoHTML = `<span>💰 ${cost}</span>`;
        if (type) {
            infoHTML = `<span>${type}</span> | ${infoHTML}`;
        }

        const navIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-navigation"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>`;
        const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="4" ry="4"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`;
        
        const reasonHTML = reason ? `<div class="reason"><b>推荐理由:</b> ${reason}</div>` : '';
        const cardClass = reason ? "card ai-recommendation" : "card";

        return `
        <div class="${cardClass}" id="poi-${id}">
            <a href="https://uri.amap.com/marker?position=${location}&name=${encodeURIComponent(name)}" target="_blank" class="nav-btn" title="导航">${navIcon}</a>
            <div class="name">${name}</div>
            <div class="info">${infoHTML}</div>
            <div class="address">
                <span>地址: ${address}</span>
                <button 
                    class="copy-btn" 
                    data-name="${name.replace(/"/g, '&quot;')}" 
                    data-address="${address.replace(/"/g, '&quot;')}" 
                    onclick="copyAddress(this)" 
                    title="复制餐厅名和地址">
                    ${copyIcon}
                </button>
            </div>
            <div class="distance">距离: ${distance} 米</div>
            ${reasonHTML}
        </div>
        `;
    } catch (error) {
        console.error("Failed to generate card for POI:", poi, "Error:", error);
        const name = (poi && poi.name) || "未知餐厅";
        return `
        <div class="card error-card">
            <div class="name">${name}</div>
            <p>抱歉，加载此餐厅的详细信息时遇到意外错误。</p>
        </div>
        `;
    }
}

async function searchNearbyRestaurants(lng, lat, radius, type) {
    document.getElementById("result").innerHTML = "正在全力搜索美味中...";

    try {
        const page_num_to_fetch = 2; // Fetch 2 pages
        const offset_per_page = 25; // Max results per page
        let allPois = [];

        for (let page = 1; page <= page_num_to_fetch; page++) {
            const searchUrl = `https://restapi.amap.com/v3/place/around?key=${key}&location=${lng},${lat}&keywords=${type}&radius=${radius}&offset=${offset_per_page}&page=${page}&extensions=all`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();

            if (searchData.status !== '1') throw new Error(`API Error on page ${page}: ${searchData.info}`);
            
            const pois = searchData.pois || [];
            if (pois.length > 0) {
                allPois.push(...pois);
            }

            // If API returns less than a full page, no need to fetch more.
            if (pois.length < offset_per_page) {
                break;
            }
        }

        if (!allPois.length) {
            document.getElementById("result").innerText = "附近没有找到餐厅";
            return;
        }

        // Fetch all details before rendering
        const batchSize = 5;
        const delay = 300;
        let richPois = [];

        for (let i = 0; i < allPois.length; i += batchSize) {
            const batch = allPois.slice(i, i + batchSize);
            const detailPromises = batch.map(p => {
                if (!p.id) return Promise.resolve(null);
                const detailUrl = `https://restapi.amap.com/v3/place/detail?key=${key}&id=${p.id}`;
                return fetch(detailUrl).then(res => res.json());
            });

            const detailResults = await Promise.all(detailPromises);

            const batchRichPois = batch.map((poi, index) => {
                 const detailData = detailResults[index];
                if (detailData && detailData.status === '1' && detailData.pois.length > 0) {
                    // Explicitly preserve the distance from the original POI
                    const distance = poi.distance;
                    const mergedPoi = { ...poi, ...detailData.pois[0] };
                    mergedPoi.distance = distance;
                    return mergedPoi;
                }
                return poi;
            });
            richPois.push(...batchRichPois);

            if (i + batchSize < allPois.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        currentPoiList = richPois;
        renderRestaurants(currentPoiList);

    } catch (error) {
        console.error("Search failed:", error);
        document.getElementById("result").innerText = "搜索失败，请检查 Key 或网络状态。";
    }
}

function renderRestaurants(pois) {
    const html = pois.map(p => getCardHTML(p)).join('');
    document.getElementById("result").innerHTML = html;
}

function copyAddress(element) {
    const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="4" ry="4"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`;
    const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="feather feather-check"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    
    const name = element.getAttribute('data-name');
    const address = element.getAttribute('data-address');
    const textToCopy = `${name}\n${address}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
        element.innerHTML = checkIcon;
        element.disabled = true;
        setTimeout(() => {
            element.innerHTML = copyIcon;
            element.disabled = false;
        }, 1500);
    }).catch(err => {
        console.error('复制失败: ', err);
        alert('复制地址失败，请手动复制。');
    });
}

// =============================
// 随机选一家
// =============================
function randomPick(){

    const cards = document.querySelectorAll("#result .card");

    if(cards.length === 0){
        alert("请先搜索餐厅");
        return;
    }

    const randomIndex = Math.floor(Math.random() * cards.length);
    const chosenCard = cards[randomIndex].cloneNode(true);
    const container = document.getElementById("random-card-container");
    container.innerHTML = "";
    container.appendChild(chosenCard);

    document
        .getElementById("random-modal")
        .classList.add("visible");
}

function closeRandomModal(){
    document
        .getElementById("random-modal")
        .classList.remove("visible");
}

// =============================
// AI 决策助手
// =============================
async function getAIAdvice(isRefresh = false) {
    if (!currentPoiList || currentPoiList.length === 0) {
        alert("请先搜索餐厅列表，AI才能给你建议");
        return;
    }

    const restaurantNames = currentPoiList.map(p => p.name);

    let prompt = `我不知道该吃什么，这里是附近的餐厅列表：[${restaurantNames.join(', ')}]。请根据这些选项，给我一些建议，并最终推荐3家。请以JSON格式返回，格式为：[{"name": "餐厅名", "reason": "推荐理由"}]`;

    if (isRefresh) {
        prompt += "\n请给我换一批不同的推荐。"
    }

    const adviceContainer = document.getElementById("ai-advice");
    adviceContainer.innerHTML = "🤖 AI正在思考中...";

    try {
        const response = await callDeepSeekAPI(prompt);
        renderAIResponse(response);
    } catch (error) {
        console.error("AI advice error:", error);
        adviceContainer.innerHTML = `<div class="card error-card"><p>调用AI服务时遇到问题，请稍后再试。</p></div>`;
    }
}


async function getAIRecommendations(isRefresh = false) {
    const restaurantCards = document.querySelectorAll("#result .card");

    if (restaurantCards.length === 0) {
        alert("请先搜索餐厅列表，AI才能给你建议");
        return;
    }

    let restaurantList = [];
    restaurantCards.forEach(card => {
        restaurantList.push(card.querySelector('.name').innerText);
    });

    const userInput = document.getElementById('ai-prompt-input').value;

    if (!userInput) {
        alert("请输入你的美食偏好，比如 '我想吃辣一点的、距离近一点的'");
        return;
    }

    let prompt = `我不知道该吃什么，我的偏好是：'${userInput}'。\
这里是附近的餐厅列表：[${restaurantList.join(', ')}]。\
请根据我的偏好，从列表中推荐3家最符合要求的餐厅。请以JSON格式返回，格式为：[{"name": "餐厅名", "reason": "推荐理由"}]`;

    if (isRefresh) {
        prompt += "\n请给我换一批不同的推荐。"
    }

    const adviceContainer = document.getElementById("ai-advice");
    adviceContainer.innerHTML = "🤖 AI正在思考中...";

    try {
        const response = await callDeepSeekAPI(prompt);
        renderAIResponse(response);
    } catch (error) {
        adviceContainer.innerHTML = "调用 AI 服务失败，请检查你的 API Key 或网络连接。";
        console.error(error);
    }
}

function renderAIResponse(response) {
    const adviceContainer = document.getElementById("ai-advice");
    if (!currentPoiList || currentPoiList.length === 0) {
        adviceContainer.innerHTML = `<div class="card error-card"><p>请先搜索餐厅，再使用AI推荐功能。</p></div>`;
        return;
    }

    let recommendations = null;
    try {
        const jsonMatch = response.match(/(\[[\s\S]*\])/);
        if (jsonMatch && jsonMatch[0]) {
            recommendations = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error("No valid JSON array found in AI response.");
        }
    } catch (e) {
        console.error("Failed to parse AI response:", e, "Original response:", response);
        adviceContainer.innerHTML = `<div class="card error-card"><p>抱歉，AI的回复格式有点问题，暂时无法为您美化显示。</p><p><strong>原始回复:</strong> ${response}</p></div>`;
        return;
    }

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
        adviceContainer.innerHTML = "<div class='card'>AI没有给出有效的推荐，请再试一次。</div>";
        return;
    }

    const poiMap = new Map(currentPoiList.map(p => [p.name, p]));

    const html = recommendations.map(rec => {
        const poi = poiMap.get(rec.name);
        if (poi) {
            return getCardHTML(poi, rec.reason);
        } else {
            // Fallback for when AI recommends a POI not in the current list
            return `
            <div class="card ai-recommendation">
                <div class="name">${rec.name} (信息不完整)</div>
                <div class="reason"><b>推荐理由:</b> ${rec.reason}</div>
            </div>
            `;
        }
    }).join('');

    adviceContainer.innerHTML = html || `<div class="card">AI没有给出有效的推荐，请再试一次。</div>`;
}

// =============================
// 调用 DeepSeek API
// =============================
async function callDeepSeekAPI(prompt) {

    // 调用我们自己的后端代理服务
    const response = await fetch("http://127.0.0.1:5001/get-ai-advice", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt })
    });

    if (!response.ok) {
        const err = await response.json();
        console.error(err);
        throw new Error("API 请求失败");
    }

    const data = await response.json();
    //return data.choices[0].message.content;
    return data.reply;
}
