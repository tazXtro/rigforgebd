import json

with open('test_output.json') as f:
    data = json.load(f)

print(f'Total items: {len(data)}')
print(f'\nFirst product:')
print(f'Name: {data[0]["name"]}')
print(f'Image: {data[0].get("image", "NO IMAGE")}')
print(f'Price: {data[0].get("price")}')
