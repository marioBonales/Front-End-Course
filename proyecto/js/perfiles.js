/*global $*/
//API KEY {apikey: "230e8bed4233bbebfaaadf119690dc1a"}
// HULK : 1009351
// THOR : 1009664
// NICK : 1009471
// WIDOW: 1009189
// IRONMAN : 1009624
// HAWKEYE : 1009338
var mapa = {
    thor: { nombre: "Thor", id: 1009664 },
    nick: { nombre: "Nick Fury", id: 1009471 },
    widow: { nombre: "Black Widow", id: 1009189 },
    ironman: { nombre: "Iron-man", id: 1009624 },
    hulk: { nombre: "The Incredible Hulk", id: 1009351 },
    hawkeye: { nombre: "Hawkeye", id: 1009338 }
};
$(function () {
    'use strict';
    //Cuando se le de click a icono se ejecutará esta función
    $(".icon").click(function (event) {
        //Mostrar la modal
        $(".modal, .modal-backdrop").show();
        //Prevenir el efecto deafult del enlace
        event.preventDefault();
        // Obtener el id del elemento al que se le dio click
        var id = $(event.currentTarget).attr("id");
        var marvelId = mapa[id].id;
        //Reemplazar el nombre del heroe
        $(".heroe").text(mapa[id].nombre);
        var url = 'https://gateway.marvel.com:443/v1/public/characters/' + marvelId;
        $.get(url, { apikey: '230e8bed4233bbebfaaadf119690dc1a'}).done(
            function (respuesta) {
                var descripcion = respuesta.data.results[0].description;
                $("#descripcion").text(descripcion);
            }
        );
    });
    //Cuando se le de click al icono de cerrar o a la modal se ejecutará esta función
    $(".closeModal, .modal").click(function () {
        //Esconder el modal
        $(".modal, .modal-backdrop").hide();
    });
    //Cuando se le de click al elemento con clase modal-dialog se ejecutará esta función
    $(".modal-dialog").click(function (event) {
        //Detiene la propagación del evento
        event.stopPropagation();
    });
});
