const wanikaniStatus = document.getElementById("wkStatus");
const svgStatus = document.getElementById("svgStatus");
const svgPreview = document.getElementById("svg");

const [apiKeyInput, submitApiKeyButton] = [document.getElementById("apiKey"), document.getElementById("submitApiKey")];
submitApiKeyButton.addEventListener("click", async () => 
{
    const token = apiKeyInput.value;

    wanikaniStatus.innerText = "Generating headers";
    const headers = new Headers
    ({
        "Wanikani-Revision": "20170710",
        Authorization: "Bearer " + token,
    });

    wanikaniStatus.innerText = "Checking WaniKani credentials";
    { // check API key
        const endpoint = new Request("https://api.wanikani.com/v2/user", 
        {
            method: "GET",
            headers: headers
        });

        const res = await fetch(endpoint);
        const body = await res.json();

        if(!body.data)
        {
            return alert("Invalid API token");
        }
    }

    wanikaniStatus.innerText = "Valid credentials. Getting kanji data from WaniKani";
    
    { // get kanji data
        let endpoint = "https://api.wanikani.com/v2/subjects?types=kanji";
        let DATA = [];

        let page = 0;
        while(endpoint != null)
        {       
            wanikaniStatus.innerText = "Getting Kanji from p = " + page++;
            
            const res = await fetch(endpoint, 
            {
                method: "GET",
                headers: headers
            });
            const body = await res.json();
        
            let data = body.data;
            for(let item of data)
            {
                let meanings = [];
                for(let meaning of item.data.meanings)
                {
                    meanings.push(meaning.meaning);
                }

                let [onyomi, kunyomi] = [[], []];
                for(let reading of item.data.readings)
                {
                    switch(reading.type)
                    {
                        case "onyomi":
                            onyomi.push(reading.reading);
                            break;
                        case "kunyomi":
                            kunyomi.push(reading.reading);
                            break;
                        default:
                            break;
                    }
                }

                svgStatus.innerText = "Getting svg data for k = " + item.data.characters;
                
                const response = await fetch(`https://kanjivg.tagaini.net/kanjivg/kanji/${item.data.characters.charCodeAt(0).toString(16).padStart(5, "0")}.svg`);
                const svgData = (await response.text()).replace(/(\r\n|\n|\r|\t)/gm, "").replace(/(.*)<svg(.*)\/svg>/g, "<svg$2/svg>");
                svgPreview.innerHTML = svgData;

                DATA.push
                ({
                    characters: item.data.characters,
                    meanings: meanings.join(", "),
                    onyomi: onyomi.join(", ") || "ない",
                    kunyomi: kunyomi.join(", ") || "ない",
                    svg: svgData
                });
            }
        
            endpoint = body.pages.next_url;
        }

        if(!DATA || DATA.length === 0)
        {
            alert("Something went wrong getting kanji data from WaniKani.");
        }

        wanikaniStatus.innerText = "Successfully gathered kanji data.";
        formatData(DATA);
    }
});

const ankiStatus = document.getElementById("ankiStatus");
function formatData(data)
{
    ankiStatus.innerText = "Generating anki file headers";
    let lines = "#seperator:Pipe\n#html:true\n#tags column:5\n";
    for(let kanji of data)
    {
        ankiStatus.innerText = "Generating anki card for k = " + kanji.characters;
        lines += kanji.characters + "|" + kanji.meanings + "|" + kanji.onyomi + "|" + kanji.kunyomi + "|" + kanji.svg + "\n";
    }

    downloadFile(lines);
}

function downloadFile(content)
{
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', "deck.txt");
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
}