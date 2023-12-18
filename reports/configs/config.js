function arraysIguais(array1, array2) {
    // Verifica se os arrays têm o mesmo comprimento
    if (array1.length !== array2.length) {
        return false;
    }

    // Cria cópias dos arrays originais
    const copiaArray1 = [...array1];
    const copiaArray2 = [...array2];

    // Ordena as cópias dos arrays em ordem crescente
    copiaArray1.sort();
    copiaArray2.sort();

    // Verifica se os elementos das cópias dos arrays são iguais
    for (let i = 0; i < copiaArray1.length; i++) {
        if (copiaArray1[i] !== copiaArray2[i]) {
            return false;
        }
    }

    // Se todas as comparações forem iguais, os arrays são considerados iguais
    return true
}

module.exports = { arraysIguais }