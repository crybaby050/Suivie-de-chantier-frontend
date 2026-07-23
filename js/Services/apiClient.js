export async function apiRequest(url, options = {} , errorMessage = "Une erreur est survenue") {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options,
    });

    if(!response.ok){
        throw new Error(errorMessage);
    }

    if(response.status === 204){
        return null
    }

    return response.json()
}