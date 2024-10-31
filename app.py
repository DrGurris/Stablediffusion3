import requests

response = requests.post(
    f"https://api.stability.ai/v2beta/stable-image/generate/ultra",
    headers={
        "authorization": f"sk-Y43ET7EYoZ8AaUxClBgPCuNKX3GyoEa6xBqfLOe7dbzI5etK",
        "accept": "image/*"
    },
    files={"none": ''},
    data={
        "prompt": "A large Great Dane dog, approximately 90 cm tall, with a white coat and black spots, standing on a sandy beach and gazing out over the ocean. The dog has a sleek black leash attached to its collar. The scene captures a tranquil, bright day with gentle ocean waves in the background and a vast sky above, emphasizing the dog's calm and reflective posture.",
        "size": "1024x1024",
        "output_format": "jpeg",
    },
)

if response.status_code == 200:
    with open("./greatdane.jpeg", 'wb') as file:
        file.write(response.content)
else:
    raise Exception(str(response.json()))