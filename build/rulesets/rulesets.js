import { createHash, randomBytes } from 'crypto';

const secret = createHash('sha256').update(randomBytes(16)).digest('hex').slice(0,16);

export const rulesets = [
    {
        id: "default",
        name: "Ads, trackers, miners, and more",
        enabled: true,
        secret,
        urls: [
            'uAssets/filters/filters.min.txt',
            'uAssets/filters/badware.min.txt',
            'uAssets/filters/privacy.min.txt',
            'uAssets/filters/unbreak.min.txt',
            'uAssets/filters/quick-fixes.min.txt',
            'uAssets/filters/ubol-filters.txt',
            'uAssets/thirdparties/easylist/easylist.txt',
            'uAssets/thirdparties/easylist/easyprivacy.txt',
        ],
        homeURL: 'https://github.com/uBlockOrigin/uAssets',
    },
    {
        id: "ctrlblk",
        name: "CtrlBlk filters",
        enabled: true,
        secret,
        urls: [
            'ctrlblk-filters/ctrlblk-filters.txt',
        ],
        homeURL: 'https://github.com/ctrlblk/ctrlblk-filters#readme',
    },
    {
        id: 'annoyances-cookies',
        name: 'EasyList/uBO – Cookie Notices',
        group: 'annoyances',
        enabled: true,
        secret,
        urls: [
            'uAssets/thirdparties/easylist/easylist-cookies.txt',
            'uAssets/filters/annoyances-cookies.txt',
        ],
        homeURL: 'https://github.com/easylist/easylist#fanboy-lists',
    },
    {
        id: 'annoyances-overlays',
        name: 'EasyList/uBO – Overlay Notices',
        group: 'annoyances',
        enabled: false,
        secret,
        urls: [
            'uAssets/thirdparties/easylist/easylist-newsletters.txt',
            'uAssets/filters/annoyances-others.txt'
        ],
        homeURL: 'https://github.com/easylist/easylist#fanboy-lists',
    },
    {
        id: 'annoyances-social',
        name: 'EasyList – Social Widgets',
        group: 'annoyances',
        enabled: false,
        secret,
        urls: [
            'uAssets/thirdparties/easylist/easylist-social.txt',
        ],
        homeURL: 'https://github.com/easylist/easylist#fanboy-lists',
    },
    {
        id: 'annoyances-widgets',
        name: 'EasyList – Chat Widgets',
        group: 'annoyances',
        enabled: false,
        secret,
        urls: [
            'uAssets/thirdparties/easylist/easylist-chat.txt',
        ],
        homeURL: 'https://github.com/easylist/easylist#fanboy-lists',
    },
    {
        id: 'annoyances-others',
        name: 'EasyList – Other Annoyances',
        group: 'annoyances',
        enabled: false,
        secret,
        urls: [
            'uAssets/thirdparties/easylist/easylist-annoyances.txt'
        ],
        homeURL: 'https://github.com/easylist/easylist#fanboy-lists',
    },
    {
        id: "alb-0",
        name: "🇦🇱al 🇽🇰xk: Adblock List for Albania",
        group: "regions",
        lang: "sq",
        enabled: false,
        urls: [
            "ctrlblk-filters/alb-0.txt",
        ],
        homeURL: "https://github.com/AnXh3L0/blocklist"
    },
    {
        id: "ara-0",
        name: "🇪🇬eg 🇸🇦sa 🇲🇦ma 🇩🇿dz: Liste AR",
        group: "regions",
        lang: "ar",
        enabled: false,
        urls: [
            "ctrlblk-filters/ara-0.txt",
        ],
        homeURL: "https://forums.lanik.us/viewforum.php?f=98"
    },
    {
        id: "bgr-0",
        name: "🇧🇬bg: Bulgarian Adblock list",
        group: "regions",
        lang: "bg mk",
        enabled: false,
        urls: [
            "ctrlblk-filters/bgr-0.txt",
        ],
        homeURL: "https://stanev.org/abp/"
    },
    {
        id: "chn-0",
        name: "🇨🇳cn 🇹🇼tw: AdGuard Chinese (中文)",
        group: "regions",
        lang: "ug zh",
        enabled: false,
        urls: [
            "ctrlblk-filters/chn-0.txt",
        ],
        homeURL: "https://github.com/AdguardTeam/AdguardFilters#adguard-filters"
    },
    {
        id: "cze-0",
        name: "🇨🇿cz 🇸🇰sk: EasyList Czech and Slovak",
        group: "regions",
        lang: "cs sk",
        enabled: false,
        urls: [
            "ctrlblk-filters/cze-0.txt",
        ],
        homeURL: "https://github.com/tomasko126/easylistczechandslovak"
    },
    {
        id: "deu-0",
        name: "🇩🇪de 🇨🇭ch 🇦🇹at: EasyList Germany",
        group: "regions",
        lang: "de dsb hsb lb rm",
        enabled: false,
        urls: [
            "ctrlblk-filters/deu-0.txt",

        ],
        homeURL: "https://forums.lanik.us/viewforum.php?f=90"
    },
    {
        id: "est-0",
        name: "🇪🇪ee: Eesti saitidele kohandatud filter",
        group: "regions",
        lang: "et",
        enabled: false,
        urls: [
            "ctrlblk-filters/est-0.txt",
        ],
        homeURL: "https://adblock.ee/"
    },
    {
        id: "fin-0",
        name: "🇫🇮fi: Adblock List for Finland",
        group: "regions",
        lang: "fi",
        enabled: false,
        urls: [
            "ctrlblk-filters/fin-0.txt",
        ],
        homeURL: "https://github.com/finnish-easylist-addition/finnish-easylist-addition"
    },
    {
        id: "fra-0",
        name: "🇫🇷fr 🇨🇦ca: AdGuard Français",
        group: "regions",
        lang: "ar br ff fr lb oc son",
        enabled: false,
        urls: [
            "ctrlblk-filters/fra-0.txt",
        ],
        homeURL: "https://github.com/AdguardTeam/AdguardFilters#adguard-filters"
    },
    {
        id: "grc-0",
        name: "🇬🇷gr 🇨🇾cy: Greek AdBlock Filter",
        group: "regions",
        lang: "el",
        enabled: false,
        urls: [
            "ctrlblk-filters/grc-0.txt",
        ],
        homeURL: "https://github.com/kargig/greek-adblockplus-filter"
    },
    {
        id: "hrv-0",
        name: "🇭🇷hr 🇷🇸rs: Dandelion Sprout's Serbo-Croatian filters",
        group: "regions",
        lang: "hr sr",
        enabled: false,
        urls: [
            "ctrlblk-filters/hrv-0.txt",
        ],
        homeURL: "https://github.com/DandelionSprout/adfilt#readme"
    },
    {
        id: "hun-0",
        name: "🇭🇺hu: hufilter",
        group: "regions",
        lang: "hu",
        enabled: false,
        urls: [
            "ctrlblk-filters/hun-0.txt",
        ],
        homeURL: "https://github.com/hufilter/hufilter"
    },
    {
        id: "idn-0",
        name: "🇮🇩id 🇲🇾my: ABPindo",
        group: "regions",
        lang: "id ms",
        enabled: false,
        urls: [
            "ctrlblk-filters/idn-0.txt",
        ],
        homeURL: "https://github.com/ABPindo/indonesianadblockrules"
    },
    {
        id: "ind-0",
        name: "🇮🇳in 🇱🇰lk 🇳🇵np: IndianList",
        group: "regions",
        lang: "as bn gu hi kn ml mr ne pa si ta te",
        enabled: false,
        urls: [
            "ctrlblk-filters/ind-0.txt",
        ],
        homeURL: "https://github.com/mediumkreation/IndianList"
    },
    {
        id: "irn-0",
        name: "🇮🇷ir: PersianBlocker",
        group: "regions",
        lang: "fa ps tg",
        enabled: false,
        urls: [
            "ctrlblk-filters/irn-0.txt",

        ],
        homeURL: "https://github.com/MasterKia/PersianBlocker"
    },
    {
        id: "isl-0",
        name: "🇮🇸is: Icelandic ABP List",
        group: "regions",
        lang: "is",
        enabled: false,
        urls: [
            "ctrlblk-filters/isl-0.txt",
        ],
        homeURL: "https://adblock.gardar.net/"
    },
    {
        id: "isr-0",
        name: "🇮🇱il: EasyList Hebrew",
        group: "regions",
        lang: "he",
        enabled: false,
        urls: [
            "ctrlblk-filters/isr-0.txt",
        ],
        homeURL: "https://github.com/easylist/EasyListHebrew"
    },
    {
        id: "ita-0",
        name: "🇮🇹it: EasyList Italy",
        group: "regions",
        lang: "it lij",
        enabled: false,
        urls: [
            "ctrlblk-filters/ita-0.txt",
        ],
        homeURL: "https://forums.lanik.us/viewforum.php?f=96"
    },
    {
        id: "jpn-1",
        name: "🇯🇵jp: AdGuard Japanese",
        group: "regions",
        lang: "ja",
        enabled: false,
        urls: [
            "ctrlblk-filters/jpn-1.txt",
        ],
        homeURL: "https://github.com/AdguardTeam/AdguardFilters#adguard-filters"
    },
    {
        id: "kor-1",
        name: "🇰🇷kr: List-KR",
        group: "regions",
        lang: "ko",
        enabled: false,
        urls: [
            "ctrlblk-filters/kor-1.txt",
        ],
        homeURL: "https://github.com/List-KR/List-KR#readme"
    },
    {
        id: "ltu-0",
        name: "🇱🇹lt: EasyList Lithuania",
        group: "regions",
        lang: "lt",
        enabled: false,
        urls: [
            "ctrlblk-filters/ltu-0.txt",
        ],
        homeURL: "https://github.com/EasyList-Lithuania/easylist_lithuania"
    },
    {
        id: "lva-0",
        name: "🇱🇻lv: Latvian List",
        group: "regions",
        lang: "lv",
        enabled: false,
        urls: [
            "ctrlblk-filters/lva-0.txt",
        ],
        homeURL: "https://github.com/Latvian-List/adblock-latvian"
    },
    {
        id: "mkd-0",
        name: "🇲🇰mk: Macedonian adBlock Filters",
        group: "regions",
        lang: "mk",
        enabled: false,
        urls: [
            "ctrlblk-filters/mkd-0.txt",
        ],
        homeURL: "https://github.com/DeepSpaceHarbor/Macedonian-adBlock-Filters"
    },
    {
        id: "nld-0",
        name: "🇳🇱nl 🇧🇪be: EasyDutch",
        group: "regions",
        lang: "af fy nl",
        enabled: false,
        urls: [
            "ctrlblk-filters/nld-0.txt",
        ],
        homeURL: "https://github.com/EasyDutch-uBO/EasyDutch/"
    },
    {
        id: "nor-0",
        name: "🇳🇴no 🇩🇰dk 🇮🇸is: Dandelion Sprouts nordiske filtre",
        group: "regions",
        lang: "nb nn no da is",
        enabled: false,
        urls: [
            "ctrlblk-filters/nor-0.txt",

        ],
        homeURL: "https://github.com/DandelionSprout/adfilt"
    },
    {
        id: "pol-0",
        name: "🇵🇱pl: Oficjalne Polskie Filtry do uBlocka Origin",
        group: "regions",
        lang: "szl pl",
        enabled: false,
        urls: [
            "ctrlblk-filters/pol-0.txt",
            "ctrlblk-filters/pol-2.txt"
        ],
        homeURL: "https://github.com/MajkiIT/polish-ads-filter/issues"
    },
    {
        id: "rou-1",
        name: "🇷🇴ro 🇲🇩md: Romanian Ad (ROad) Block List Light",
        group: "regions",
        lang: "ro",
        enabled: false,
        urls: [
            "ctrlblk-filters/rou-1.txt",
        ],
        homeURL: "https://github.com/tcptomato/ROad-Block"
    },
    {
        id: "rus-0",
        name: "🇷🇺ru 🇺🇦ua 🇺🇿uz 🇰🇿kz: RU AdList",
        group: "regions",
        lang: "be kk tt ru uk uz",
        enabled: false,
        urls: [
            "ctrlblk-filters/rus-0.txt",
        ],
        homeURL: "https://forums.lanik.us/viewforum.php?f=102"
    },
    {
        id: "spa-0",
        name: "🇪🇸es 🇦🇷ar 🇲🇽mx 🇨🇴co: EasyList Spanish",
        group: "regions",
        lang: "an ast ca cak es eu gl gn trs quz",
        enabled: false,
        urls: [
            "ctrlblk-filters/spa-0.txt",
        ],
        homeURL: "https://forums.lanik.us/viewforum.php?f=103"
    },
    {
        id: "spa-1",
        name: "🇪🇸es 🇦🇷ar 🇧🇷br 🇵🇹pt: AdGuard Spanish/Portuguese",
        group: "regions",
        lang: "an ast ca cak es eu gl gn trs pt quz",
        enabled: false,
        urls: [
            "ctrlblk-filters/spa-1.txt",
        ],
        homeURL: "https://github.com/AdguardTeam/AdguardFilters#adguard-filters"
    },
    {
        id: "svn-0",
        name: "🇸🇮si: Slovenian List",
        group: "regions",
        lang: "sl",
        enabled: false,
        urls: [
            "ctrlblk-filters/svn-0.txt",
        ],
        homeURL: "https://github.com/betterwebleon/slovenian-list"
    },
    {
        id: "swe-1",
        name: "🇸🇪se: Frellwit's Swedish Filter",
        group: "regions",
        lang: "sv",
        enabled: false,
        urls: [
            "ctrlblk-filters/swe-1.txt",
        ],
        homeURL: "https://github.com/lassekongo83/Frellwits-filter-lists"
    },
    {
        id: "tha-0",
        name: "🇹🇭th: EasyList Thailand",
        group: "regions",
        lang: "th",
        enabled: false,
        urls: [
            "ctrlblk-filters/tha-0.txt",
        ],
        homeURL: "https://github.com/easylist-thailand/easylist-thailand"
    },
    {
        id: "tur-0",
        name: "🇹🇷tr: AdGuard Turkish",
        group: "regions",
        lang: "tr",
        enabled: false,
        urls: [
            "ctrlblk-filters/tur-0.txt",
        ],
        homeURL: "https://github.com/AdguardTeam/AdguardFilters#adguard-filters"
    },
    {
        id: "vie-1",
        name: "🇻🇳vn: ABPVN List",
        group: "regions",
        lang: "vi",
        enabled: false,
        urls: [
            "ctrlblk-filters/vie-1.txt",
        ],
        homeURL: "https://abpvn.com/"
    }
];