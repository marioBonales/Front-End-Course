/*global $*/
//API KEY {apikey: "230e8bed4233bbebfaaadf119690dc1a"}
// HULK : 1009351
// THOR : 1009664
// NICK : 1009471
// WIDOW: 1009189
// IRONMAN : 1009624
// HAWKEYE : 1009338
var mapa = {
    thor: "Thor",
    nick: "Nick Fury",
    widow: "Black Widow",
    ironman: "Iron-man",
    hulk: "The Incredible Hulk",
    hawkeye: "Hawkeye"
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
        //Reemplazar el nombre del heroe
        $(".heroe").text(mapa[id]);
        var url = 'https://gateway.marvel.com:443/v1/public/characters/1009351';
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
