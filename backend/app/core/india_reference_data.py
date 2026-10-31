"""
FloodWatch India — Static Indian state and district reference data.
This is administrative reference data (not live measurements).
Sources: Census of India administrative boundary data, publicly available.
"""
from typing import List, Dict, Any

# Canonical list of Indian states and union territories
# lat/lon = approximate centroid for map positioning
INDIAN_STATES: List[Dict[str, Any]] = [
    {"code": "AN", "name": "Andaman and Nicobar Islands", "name_hi": "अंडमान और निकोबार द्वीप समूह", "lat": 11.7401, "lon": 92.6586},
    {"code": "AP", "name": "Andhra Pradesh", "name_hi": "आंध्र प्रदेश", "lat": 15.9129, "lon": 79.7400},
    {"code": "AR", "name": "Arunachal Pradesh", "name_hi": "अरुणाचल प्रदेश", "lat": 28.2180, "lon": 94.7278},
    {"code": "AS", "name": "Assam", "name_hi": "असम", "lat": 26.2006, "lon": 92.9376},
    {"code": "BR", "name": "Bihar", "name_hi": "बिहार", "lat": 25.0961, "lon": 85.3131},
    {"code": "CH", "name": "Chandigarh", "name_hi": "चंडीगढ़", "lat": 30.7333, "lon": 76.7794},
    {"code": "CT", "name": "Chhattisgarh", "name_hi": "छत्तीसगढ़", "lat": 21.2787, "lon": 81.8661},
    {"code": "DH", "name": "Dadra and Nagar Haveli and Daman and Diu", "name_hi": "दादरा और नगर हवेली और दमन और दीव", "lat": 20.4283, "lon": 72.8397},
    {"code": "DL", "name": "Delhi", "name_hi": "दिल्ली", "lat": 28.7041, "lon": 77.1025},
    {"code": "GA", "name": "Goa", "name_hi": "गोवा", "lat": 15.2993, "lon": 74.1240},
    {"code": "GJ", "name": "Gujarat", "name_hi": "गुजरात", "lat": 22.2587, "lon": 71.1924},
    {"code": "HP", "name": "Himachal Pradesh", "name_hi": "हिमाचल प्रदेश", "lat": 31.1048, "lon": 77.1734},
    {"code": "HR", "name": "Haryana", "name_hi": "हरियाणा", "lat": 29.0588, "lon": 76.0856},
    {"code": "JH", "name": "Jharkhand", "name_hi": "झारखंड", "lat": 23.6102, "lon": 85.2799},
    {"code": "JK", "name": "Jammu and Kashmir", "name_hi": "जम्मू और कश्मीर", "lat": 33.7782, "lon": 76.5762},
    {"code": "KA", "name": "Karnataka", "name_hi": "कर्नाटक", "lat": 15.3173, "lon": 75.7139},
    {"code": "KL", "name": "Kerala", "name_hi": "केरल", "lat": 10.8505, "lon": 76.2711},
    {"code": "LA", "name": "Ladakh", "name_hi": "लद्दाख", "lat": 34.2268, "lon": 77.5619},
    {"code": "LD", "name": "Lakshadweep", "name_hi": "लक्षद्वीप", "lat": 10.5593, "lon": 72.6369},
    {"code": "MH", "name": "Maharashtra", "name_hi": "महाराष्ट्र", "lat": 19.7515, "lon": 75.7139},
    {"code": "MN", "name": "Manipur", "name_hi": "मणिपुर", "lat": 24.6637, "lon": 93.9063},
    {"code": "MP", "name": "Madhya Pradesh", "name_hi": "मध्य प्रदेश", "lat": 22.9734, "lon": 78.6569},
    {"code": "MZ", "name": "Mizoram", "name_hi": "मिज़ोरम", "lat": 23.1645, "lon": 92.9376},
    {"code": "NL", "name": "Nagaland", "name_hi": "नागालैंड", "lat": 26.1584, "lon": 94.5624},
    {"code": "OD", "name": "Odisha", "name_hi": "ओडिशा", "lat": 20.9517, "lon": 85.0985},
    {"code": "PB", "name": "Punjab", "name_hi": "पंजाब", "lat": 31.1471, "lon": 75.3412},
    {"code": "PY", "name": "Puducherry", "name_hi": "पुडुचेरी", "lat": 11.9416, "lon": 79.8083},
    {"code": "RJ", "name": "Rajasthan", "name_hi": "राजस्थान", "lat": 27.0238, "lon": 74.2179},
    {"code": "SK", "name": "Sikkim", "name_hi": "सिक्किम", "lat": 27.5330, "lon": 88.5122},
    {"code": "TG", "name": "Telangana", "name_hi": "तेलंगाना", "lat": 18.1124, "lon": 79.0193},
    {"code": "TR", "name": "Tripura", "name_hi": "त्रिपुरा", "lat": 23.9408, "lon": 91.9882},
    {"code": "UP", "name": "Uttar Pradesh", "name_hi": "उत्तर प्रदेश", "lat": 26.8467, "lon": 80.9462},
    {"code": "UT", "name": "Uttarakhand", "name_hi": "उत्तराखंड", "lat": 30.0668, "lon": 79.0193},
    {"code": "WB", "name": "West Bengal", "name_hi": "पश्चिम बंगाल", "lat": 22.9868, "lon": 87.8550},
]


# Key monitoring districts with coordinates for initial data coverage
# (These are the districts where we can fetch Open-Meteo data)
MONITORED_DISTRICTS: List[Dict[str, Any]] = [
    {"code": "AS-KAM", "state_code": "AS", "name": "Kamrup (Guwahati)", "lat": 26.1445, "lon": 91.7362},
    {"code": "AS-JOR", "state_code": "AS", "name": "Jorhat", "lat": 26.7509, "lon": 94.2037},
    {"code": "AS-DIB", "state_code": "AS", "name": "Dibrugarh", "lat": 27.4728, "lon": 94.9120},
    {"code": "AS-SIL", "state_code": "AS", "name": "Silchar", "lat": 24.8282, "lon": 92.7983},
    {"code": "KL-EKM", "state_code": "KL", "name": "Ernakulam", "lat": 9.9816, "lon": 76.2999},
    {"code": "KL-ALP", "state_code": "KL", "name": "Alappuzha", "lat": 9.4981, "lon": 76.3388},
    {"code": "KL-TVM", "state_code": "KL", "name": "Thiruvananthapuram", "lat": 8.5241, "lon": 76.9366},
    {"code": "TN-CHE", "state_code": "TN", "name": "Chennai", "lat": 13.0827, "lon": 80.2707},
    {"code": "MH-MUM", "state_code": "MH", "name": "Mumbai City", "lat": 19.0760, "lon": 72.8777},
    {"code": "MH-PUN", "state_code": "MH", "name": "Pune", "lat": 18.5204, "lon": 73.8567},
    {"code": "KA-BLR", "state_code": "KA", "name": "Bengaluru Urban", "lat": 12.9716, "lon": 77.5946},
    {"code": "DL-NDL", "state_code": "DL", "name": "New Delhi", "lat": 28.6139, "lon": 77.2090},
    {"code": "WB-KOL", "state_code": "WB", "name": "Kolkata", "lat": 22.5726, "lon": 88.3639},
    {"code": "BR-PAT", "state_code": "BR", "name": "Patna", "lat": 25.5941, "lon": 85.1376},
    {"code": "OD-BBN", "state_code": "OD", "name": "Bhubaneswar", "lat": 20.2961, "lon": 85.8189},
    {"code": "UP-LKO", "state_code": "UP", "name": "Lucknow", "lat": 26.8467, "lon": 80.9462},
    {"code": "GJ-AHM", "state_code": "GJ", "name": "Ahmedabad", "lat": 23.0225, "lon": 72.5714},
    {"code": "AP-VIJ", "state_code": "AP", "name": "Vijayawada", "lat": 16.5062, "lon": 80.6480},
]


# River stations with GloFAS coordinates (for Open-Meteo Flood API)
# GloFAS resolution is ~9km; coordinates should be near the river channel
RIVER_STATIONS: List[Dict[str, Any]] = [
    {
        "station_code": "BRAHMAPUTRA-GUWAHATI",
        "name": "Brahmaputra at Guwahati",
        "river_name": "Brahmaputra",
        "lat": 26.1445, "lon": 91.7362,
        "state_code": "AS",
        "source_id": "open-meteo-flood-glofas",
        "measurement_type": "discharge_m3s",
        "warning_level_m": None,  # Not available from GloFAS
        "danger_level_m": None,
    },
    {
        "station_code": "YAMUNA-DELHI",
        "name": "Yamuna at Delhi",
        "river_name": "Yamuna",
        "lat": 28.7041, "lon": 77.1025,
        "state_code": "DL",
        "source_id": "open-meteo-flood-glofas",
        "measurement_type": "discharge_m3s",
        "warning_level_m": None,
        "danger_level_m": None,
    },
    {
        "station_code": "GANGA-PATNA",
        "name": "Ganga at Patna",
        "river_name": "Ganga",
        "lat": 25.5941, "lon": 85.1376,
        "state_code": "BR",
        "source_id": "open-meteo-flood-glofas",
        "measurement_type": "discharge_m3s",
        "warning_level_m": None,
        "danger_level_m": None,
    },
    {
        "station_code": "MAHANADI-CUTTACK",
        "name": "Mahanadi at Cuttack",
        "river_name": "Mahanadi",
        "lat": 20.4625, "lon": 85.8828,
        "state_code": "OD",
        "source_id": "open-meteo-flood-glofas",
        "measurement_type": "discharge_m3s",
        "warning_level_m": None,
        "danger_level_m": None,
    },
    {
        "station_code": "PERIYAR-ERNAKULAM",
        "name": "Periyar near Ernakulam",
        "river_name": "Periyar",
        "lat": 9.9816, "lon": 76.2999,
        "state_code": "KL",
        "source_id": "open-meteo-flood-glofas",
        "measurement_type": "discharge_m3s",
        "warning_level_m": None,
        "danger_level_m": None,
    },
]
